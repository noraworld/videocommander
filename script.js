$(function() {

  var settings = {
    // オプションで変更可能なキーコード
    togglePlayAndPauseKeyCode:     'p',
    jumpToBeginningKeyCode:        'h',
    jumpToEndKeyCode:              'e',
    rewindTimeKeyCode:             'a',
    advanceTimeKeyCode:            's',
    speedDownKeyCode:              'd',
    speedUpKeyCode:                'u',
    resetSpeedKeyCode:             'r',
    partialLoopKeyCode:            'l',
    partialLoopPrecision:          100,
    skipTimeAmount:                  5,
    scrollToPlayerChecked:        true,
    rememberPlaybackSpeedChecked: true,
    playbackSpeed:                 1.0,
  };
  var fixed = {
    // 固定のキーコード
    togglePlayAndPauseKeyCode: ' ',           // space
    rewindTimeKeyCode:         'ArrowLeft',   // left-arrow
    advanceTimeKeyCode:        'ArrowRight',  // right-arrow
    isEscape:                  'Escape',      // esc
  };

  chrome.storage.sync.get(settings, function(storage) {
    settings.togglePlayAndPauseKeyCode    = storage.togglePlayAndPauseKeyCode;
    settings.jumpToBeginningKeyCode       = storage.jumpToBeginningKeyCode;
    settings.jumpToEndKeyCode             = storage.jumpToEndKeyCode;
    settings.rewindTimeKeyCode            = storage.rewindTimeKeyCode;
    settings.advanceTimeKeyCode           = storage.advanceTimeKeyCode;
    settings.speedDownKeyCode             = storage.speedDownKeyCode;
    settings.speedUpKeyCode               = storage.speedUpKeyCode;
    settings.resetSpeedKeyCode            = storage.resetSpeedKeyCode;
    settings.partialLoopKeyCode           = storage.partialLoopKeyCode;
    settings.partialLoopPrecision         = storage.partialLoopPrecision;
    settings.skipTimeAmount               = Number(storage.skipTimeAmount);
    settings.scrollToPlayerChecked        = Boolean(storage.scrollToPlayerChecked);
    settings.rememberPlaybackSpeedChecked = Boolean(storage.rememberPlaybackSpeedChecked);
    settings.playbackSpeed                = Number(storage.playbackSpeed);
    getVideoElement();
  });

  // グローバル変数
  // loopStatus:
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
  var setPlaybackSpeedSuccessfullyOrSkipable = false;

  // video要素を取得する
  function getVideoElement() {
    if (document.getElementsByTagName('video')[0] !== undefined) {
      if (document.getElementsByTagName('video')[0].readyState === 4) {
        player = document.getElementsByTagName('video')[0];
        clearTimeout(getVideoTimeoutID);
        observeSpeed();
        getPlaybackSpeed();
        return false;
      }
    }
    getVideoTimeoutID = setTimeout(function() {
      getVideoElement();
    }, 10);
  };

  // キーが押されたかどうかを判定
  window.addEventListener('keydown', function(event) {
    // 円マークをバックスラッシュに変換
    var eventKey = encodeYenSignToBackslash(event.key);

    // escが押されたらアクティブフォーカスを外す
    if (eventKey == fixed.isEscape) {
      activeBlur();
    }

    // Ctrl + r が押されたら video 要素を取得し直す (試験的機能)
    if (event.ctrlKey && eventKey == 'r') {
      getVideoElement();
      console.info('Reload video element successfully.\n\nStill have problem? Report that from https://github.com/noraworld/videocommander/issues.\nThank you for cooperating with development!');
    }

    // 動画がないときはキーイベントを実行しない
    if (player === undefined) {
      return false;
    }

    // Ctrl + c が押されたらループステータスをリセットする
    // Esc だと、リセットより全画面の解除が優先されてしまうため
    // Ctrl + c でもリセットできるようにした
    if (event.ctrlKey && eventKey == 'c') {
      resetLoopStatus();
    }

    // 修飾キーをエスケープ
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return false;
    }

    // 入力フォームにフォーカスがあるときはショートカットを無効化
    if ((document.activeElement.nodeName === 'INPUT'
    || document.activeElement.nodeName === 'TEXTAREA'
    || document.activeElement.getAttribute('type') === 'text')
    || document.activeElement.isContentEditable === true) {
      return false;
    }
    else {
      event.stopPropagation();
      activeBlur();
    }

    // オプションのキーと固定のキーに関しては
    // 元々サイトで実装されているイベントリスナーを
    // 無効化してこちらの処理のみを実行する
    Object.keys(settings).forEach(function(key) {
      if (eventKey == settings[key]) {
        event.stopPropagation();
        if (settings.scrollToPlayerChecked === true) {
          scrollToPlayer();
          getVideoElement();
        }
      }
    });
    Object.keys(fixed).forEach(function(key) {
      if (eventKey == fixed[key]) {
        event.stopPropagation();
        if (settings.scrollToPlayerChecked === true) {
          scrollToPlayer();
          getVideoElement();
        }
      }
    });

    // ショートカットキーから関数を呼び出す
    switch (eventKey) {
      // オプションのキーコード
      case settings.togglePlayAndPauseKeyCode: togglePlayAndPause(); break;  // default: p
      case settings.jumpToBeginningKeyCode:    jumpToBeginning();    break;  // default: h
      case settings.jumpToEndKeyCode:          jumpToEnd();          break;  // default: e
      case settings.rewindTimeKeyCode:         rewindTime();         break;  // default: a
      case settings.advanceTimeKeyCode:        advanceTime();        break;  // default: s
      case settings.speedDownKeyCode:          speedDown();          break;  // default: d
      case settings.speedUpKeyCode:            speedUp();            break;  // default: u
      case settings.resetSpeedKeyCode:         resetSpeed();         break;  // default: r
      // 固定のキーコード
      case fixed.togglePlayAndPauseKeyCode: event.preventDefault(); togglePlayAndPause(); break;  // space
      case fixed.rewindTimeKeyCode:         event.preventDefault(); rewindTime();         break;  // left-arrow
      case fixed.advanceTimeKeyCode:        event.preventDefault(); advanceTime();        break;  // right-arrow
      case fixed.isEscape:                                          resetLoopStatus();    break;  // esc
    }

    // 数字のキーを押すとその数字に対応する割合まで動画を移動する
    // キーボードの 3 を押すと動画全体の 30% の位置に移動する
    // 固定のキーコード
    if (eventKey >= '0' && eventKey <= '9') {
      jumpToTimerRatio(eventKey);
    }

    // 部分ループ再生のステータスを記録
    // オプションで変更可能なキーコード
    // default: l
    if (eventKey == settings.partialLoopKeyCode) {
      if (loopStatus === undefined) {
        loopStatus = 0;
      }
      loopStatus++;
      partialLoop();
    }
  }, true);

  // 再生スピードの変更を監視する
  function observeSpeed() {
    player.onratechange = function() {
      setSpeedRange(player.playbackRate);
    };
  };

  function getPlaybackSpeed() {
    if (settings.rememberPlaybackSpeedChecked === true) {
      player.playbackRate = floorFormat(settings.playbackSpeed, 1);
    }
  }

  function setPlaybackSpeed() {
    if (settings.rememberPlaybackSpeedChecked === true) {
      chrome.storage.sync.set({
        playbackSpeed: Number(floorFormat(player.playbackRate, 1))
      }, function() {
        statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
      });
    }
    else {
      statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
    }
  }

  // 再生/停止
  function togglePlayAndPause() {
    if (player.paused === true)
      player.play();
    else
      player.pause();
  };

  // 数秒巻き戻し
  function rewindTime() {
    player.currentTime -= settings.skipTimeAmount;
  };

  // 数秒早送り
  function advanceTime() {
    player.currentTime += settings.skipTimeAmount;
  };

  // 再生スピードダウン
  function speedDown() {
    player.playbackRate = floorFormat((player.playbackRate - 0.09), 1);
    setPlaybackSpeed();
  }

  // 再生スピードアップ
  function speedUp() {
    player.playbackRate = floorFormat((player.playbackRate + 0.11), 1);
    setPlaybackSpeed();
  }

  // 再生スピードリセット
  function resetSpeed() {
    player.playbackRate = 1.0;
    setPlaybackSpeed();
  }

  // 動画の最初の位置に移動する
  function jumpToBeginning() {
    player.currentTime = player.seekable.start(0);
  };

  // 動画の最後の位置に移動する
  function jumpToEnd() {
    player.currentTime = player.seekable.end(0);
  };

  // 数字に対応する割合まで動画を移動する
  function jumpToTimerRatio(timerRatio) {
    timerRatio = Number(timerRatio) / 10;
    player.currentTime = player.seekable.end(0) * timerRatio;
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
      }, settings.partialLoopPrecision);
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

  // 円マークをバックスラッシュに変換する
  function encodeYenSignToBackslash(key) {
    // 165 -> Yen Sign
    if (key.charCodeAt() == 165) {
      key = '\\';
    }
    return key;
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
