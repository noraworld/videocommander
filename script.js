chrome.extension.sendMessage({}, function(response) {
  var settings = {
    // オプションで変更可能なキーコード
    togglePlayAndPauseKeyCode:      112,  // default: p
    jumpToBeginningKeyCode:         104,  // defualt: h
    jumpToEndKeyCode:               101,  // default: e
    rewindTimeKeyCode:               97,  // default: a
    advanceTimeKeyCode:             115,  // default: s
    speedDownKeyCode:               100,  // default: d
    speedUpKeyCode:                 117,  // default: u
    resetSpeedKeyCode:              114,  // default: r
    partialLoopKeyCode:             108,  // default: l
    skipTimeAmount:                   5,  // default: 5 sec
  };
  var fixed = {
    // 固定のキーコード
    togglePlayAndPauseKeyCode: 32,  // space
    rewindTimeKeyCode:         37,  // left-arrow
    advanceTimeKeyCode:        39,  // right-arrow
    isEscape:                  27,  // esc
  };

  chrome.storage.sync.get(settings, function(storage) {
    settings.togglePlayAndPauseKeyCode = Number(storage.togglePlayAndPauseKeyCode);
    settings.jumpToBeginningKeyCode    = Number(storage.jumpToBeginningKeyCode);
    settings.jumpToEndKeyCode          = Number(storage.jumpToEndKeyCode);
    settings.rewindTimeKeyCode         = Number(storage.rewindTimeKeyCode);
    settings.advanceTimeKeyCode        = Number(storage.advanceTimeKeyCode);
    settings.speedDownKeyCode          = Number(storage.speedDownKeyCode);
    settings.speedUpKeyCode            = Number(storage.speedUpKeyCode);
    settings.resetSpeedKeyCode         = Number(storage.resetSpeedKeyCode);
    settings.partialLoopKeyCode        = Number(storage.partialLoopKeyCode);
    settings.skipTimeAmount            = Number(storage.skipTimeAmount);
  });

  // グローバル変数
  // loopStatus
  //   0 -> Not set
  //   1 -> Set
  //   2 -> Loop
  //   3 -> Restore
  var player;
  var loopStatus = 0;
  var loopStart;
  var loopEnd;
  var loopFlag = false;
  var loopTimeoutID;
  var removeStatusBoxTimeoutID;
  var getVideoTimeoutID;

  // video要素を取得する
  function getVideoElement() {
    if (document.getElementsByTagName('video')[0] !== undefined) {
      player = document.getElementsByTagName('video')[0];
      clearTimeout(getVideoTimeoutID);
      observeSpeed();
      return false;
    }
    getVideoTimeoutID = setTimeout(function() {
      getVideoElement();
    }, 10);
  };
  getVideoElement();

  // オプションのキーが押されたかどうかを判定
  window.addEventListener('keypress', function(event) {
    // 動画がないときはキーイベントを実行しない
    if (player === undefined) {
      return false;
    }

    // オプションのキーと固定のキーに関しては
    // 元々サイトで実装されているイベントリスナーを
    // 無効化してこちらの処理のみを実行する
    Object.keys(settings).forEach(function(key) {
      if (event.keyCode == settings[key]) {
        event.stopPropagation();
      }
    });

    // 入力フォームにフォーカスがあるときはショートカットを無効化
    if ((document.activeElement.nodeName === 'INPUT'
    || document.activeElement.nodeName === 'TEXTAREA'
    || document.activeElement.getAttribute('type') === 'text')
    || document.activeElement.isContentEditable === true) {
      return false;
    }
    else {
      activeBlur();
    }

    // cmd, ctrl, alt をエスケープ
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return false;
    }

    // ショートカットキーから関数を呼び出す
    switch (event.keyCode) {
      // オプションのキーコード
      case settings.togglePlayAndPauseKeyCode: togglePlayAndPause(); break;  // default: p
      case settings.jumpToBeginningKeyCode:    jumpToBeginning();    break;  // default: h
      case settings.jumpToEndKeyCode:          jumpToEnd();          break;  // default: e
      case settings.rewindTimeKeyCode:         rewindTime();         break;  // default: a
      case settings.advanceTimeKeyCode:        advanceTime();        break;  // default: s
      case settings.speedDownKeyCode:          speedDown();          break;  // default: d
      case settings.speedUpKeyCode:            speedUp();            break;  // default: u
      case settings.resetSpeedKeyCode:         resetSpeed();         break;  // default: r
    }

    // 数字のキーを押すとその数字に対応する割合まで動画を移動する
    // キーボードの 3 を押すと動画全体の 30% の位置に移動する
    // 固定のキーコード
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      jumpToTimerRatio(event.keyCode);
    }

    // 部分ループ再生のステータスを記録
    // オプションで変更可能なキーコード
    // default: L
    if (event.keyCode == settings.partialLoopKeyCode) {
      if (loopStatus === undefined) {
        loopStatus = 0;
      }
      loopStatus++;
      partialLoop();
    }
  }, true);

  // 固定のキーが押されたかどうかを判定
  window.addEventListener('keydown', function(event) {
    if (player === undefined) {
      return false;
    }

    Object.keys(fixed).forEach(function(key) {
      if (event.keyCode == fixed[key]) {
        event.stopPropagation();
      }
    });

    if ((document.activeElement.nodeName === 'INPUT'
    || document.activeElement.nodeName === 'TEXTAREA'
    || document.activeElement.getAttribute('type') === 'text')
    || document.activeElement.isContentEditable === true) {
      return false;
    }
    else {
      activeBlur();
    }

    if (event.metaKey || event.shiftKey || event.ctrlKey || event.altKey) {
      return false;
    }

    switch (event.keyCode) {
      // 固定のキーコード
      case fixed.togglePlayAndPauseKeyCode: event.preventDefault(); togglePlayAndPause(); break;  // space
      case fixed.rewindTimeKeyCode:         event.preventDefault(); rewindTime();         break;  // left-arrow
      case fixed.advanceTimeKeyCode:        event.preventDefault(); advanceTime();        break;  // right-arrow
      case fixed.isEscape:                  activeBlur();           resetLoopStatus();    break;  // esc
    }
  }, true);

  // 再生スピードの変更を監視する
  function observeSpeed() {
    player.onratechange = function() {
      setSpeedRange(player.playbackRate);
    };
  };

  // 再生/停止
  function togglePlayAndPause() {
    if (player.paused === true)
      player.play();
    else
      player.pause();
    scrollToPlayer();
  };

  // 数秒巻き戻し
  function rewindTime() {
    player.currentTime -= settings.skipTimeAmount;
    scrollToPlayer();
  };

  // 数秒早送り
  function advanceTime() {
    player.currentTime += settings.skipTimeAmount;
    scrollToPlayer();
  };

  // 再生スピードダウン
  function speedDown() {
    player.playbackRate = floorFormat((player.playbackRate - 0.09), 1);
    statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
    scrollToPlayer();
  }

  // 再生スピードアップ
  function speedUp() {
    player.playbackRate = floorFormat((player.playbackRate + 0.11), 1);
    statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
    scrollToPlayer();
  }

  // 再生スピードリセット
  function resetSpeed() {
    player.playbackRate = 1.0;
    statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
    scrollToPlayer();
  }

  // 動画の最初の位置に移動する
  function jumpToBeginning() {
    player.currentTime = player.seekable.start(0);
    scrollToPlayer();
  };

  // 動画の最後の位置に移動する
  function jumpToEnd() {
    player.currentTime = player.seekable.end(0);
    scrollToPlayer();
  };

  // 数字に対応する割合まで動画を移動する
  function jumpToTimerRatio(timerRatio) {
    timerRatio = (timerRatio - 48) / 10;
    player.currentTime = player.seekable.end(0) * timerRatio;
    scrollToPlayer();
  };

  // 部分ループ再生
  function partialLoop() {
    if (loopStatus === 1) {
      loopStart = player.currentTime;
      statusBox('set', 'Set');
    }
    else if (loopStatus === 2) {
      if (loopFlag === false) {
        loopEnd = player.currentTime;
        loopFlag = true;
        statusBox('loop', 'Loop!');
      }
      loopTimeoutID = setTimeout(function() {
        if (player.currentTime >= loopEnd || player.currentTime < loopStart) {
          player.currentTime = loopStart;
        }
        if (loopStatus === 3) {
          clearTimeout(loopTimeoutID);
          loopStatus = 0;
          loopFlag = false;
          statusBox('restore', 'Restore');
          return false;
        }
        partialLoop();
      }, 100);
    }
  };

  // アクティブフォーカスを外す
  function activeBlur() {
    document.activeElement.blur();
  };

  // ループステータスをリセットする
  function resetLoopStatus() {
    if (loopStatus !== 0) {
      clearTimeout(loopTimeoutID);
      loopStatus = 0;
      loopFlag = false;
      statusBox('reset', 'Restore');
    }
  };

  // 小数点第(n+1)位を切り捨てて小数点第n位まで求める
  function floorFormat(number, n) {
    var _pow = Math.pow(10, n);
    return Math.floor(number * _pow) / _pow;
  };

  // 動画プレイヤーのある位置までスクロールする
  function scrollToPlayer() {
    var rect = player.getBoundingClientRect();
    var positionY = rect.top;
    var dElm = document.documentElement;
    var dBody = document.body;
    var scrollY = dElm.scrollTop || dBody.scrollTop;
    var y = positionY + scrollY - 100;
    window.scrollTo(0, y);
  };

  // 部分ループ再生のステータスを表示する
  function statusBox(status, statusStr) {
    if (status === 'set') {
      var videoStatus = '<span class="video-status-keep-showing">' + statusStr + '</span>';
    }
    else {
      var videoStatus = '<span class="video-status">' + statusStr + '</span>';
    }

    $('.video-status').remove();
    if (status === 'loop') {
      $('.video-status-keep-showing').remove();
    }
    if (status === 'reset') {
      $('.video-status-keep-showing').remove();
      clearTimeout(removeStatusBoxTimeoutID);
    }

    $(videoStatus).insertBefore('video');

    if ($('span').hasClass('video-status') && $('span').hasClass('video-status-keep-showing')) {
      $('.video-status-keep-showing').css('display', 'none');
      clearTimeout(removeStatusBoxTimeoutID);
      removeStatusBoxTimeoutID = setTimeout(function() {
        $('.video-status').remove();
        $('.video-status-keep-showing').css('display', 'inline-block');
      }, 1000);
    }
    else {
      $('.video-status').fadeOut(1000, function() {
        $(this).remove();
      });
    }
  };

  // 再生スピードの上限と下限を設定する
  function setSpeedRange(speedChecker) {
    if (speedChecker < 0.5) {
      player.playbackRate = 0.5;
    }
    else if (speedChecker > 4.0) {
      player.playbackRate = 4.0;
    }
  };

  // 表示される再生スピードを調整する
  function adjustSpeedStatus(speedStatus) {
    if (speedStatus < 0.5) {
      speedStatus = 0.5;
    }
    else if (speedStatus > 4.0) {
      speedStatus = 4.0;
    }
    return speedStatus.toFixed(1);
  };
});
