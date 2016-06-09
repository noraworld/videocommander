chrome.extension.sendMessage({}, function(response) {

  var settings = {
    togglePlayAndPauseKeyCode: 80,  // default: P
    jumpToBeginningKeyCode:    72,  // defualt: H
    jumpToEndKeyCode:          69,  // default: E
    rewindTimeKeyCode:         65,  // default: A
    advanceTimeKeyCode:        83,  // default: S
    partialLoopKeyCode:        82,  // default: R
    skipTimeAmount:             5,  // default: 5
  };

  chrome.storage.sync.get(settings, function(storage) {
    settings.togglePlayAndPauseKeyCode = Number(storage.togglePlayAndPauseKeyCode);
    settings.jumpToBeginningKeyCode    = Number(storage.jumpToBeginningKeyCode);
    settings.jumpToEndKeyCode          = Number(storage.jumpToEndKeyCode);
    settings.rewindTimeKeyCode         = Number(storage.rewindTimeKeyCode);
    settings.advanceTimeKeyCode        = Number(storage.advanceTimeKeyCode);
    settings.partialLoopKeyCode        = Number(storage.partialLoopKeyCode);
    settings.skipTimeAmount            = Number(storage.skipTimeAmount);
  });

  // Global variable
  var loopStatus = 0;
  var loopStart;
  var loopEnd;
  var loopTimeoutID;
  var flag = 0;

  // キーが押されたかどうかを判定
  document.addEventListener('keydown', function(event) {

    // 入力フォームにフォーカスがあるときはショートカットを無効化
    if ((document.activeElement.nodeName === 'INPUT'
    || document.activeElement.nodeName === 'TEXTAREA'
    || document.activeElement.getAttribute('type') === 'text')
    || document.activeElement.isContentEditable === true) {
      return false;
    } else {
      activeBlur();
    }

    // cmd, shift, ctrl, alt をエスケープ
    if (event.metaKey || event.shiftKey || event.ctrlKey || event.altKey) {
      return false;
    }

    // ショートカットキーから関数を呼び出す
    switch (event.keyCode) {
      // オプションで変更可能なキーコード
      case settings.togglePlayAndPauseKeyCode: togglePlayAndPause(); break; // default: P
      case settings.jumpToBeginningKeyCode:    jumpToBeginning();    break; // default: H
      case settings.jumpToEndKeyCode:          jumpToEnd();          break; // default: E
      case settings.rewindTimeKeyCode:         rewindTime();         break; // default: A
      case settings.advanceTimeKeyCode:        advanceTime();        break; // default: S

      // 固定のキーコード
      case 32: event.preventDefault(); togglePlayAndPause(); break; // space
      case 37:                         rewindTime();         break; // left-arrow
      case 39:                         advanceTime();        break; // right-arrow
      case 27:                         activeBlur();         break; // esc
    }

    // 数字のキーを押すとその数字に対応する割合まで動画を移動する
    // キーボードの 3 を押すと動画全体の 30% の位置に移動する
    // 固定のキーコード
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      jumpToTimerRatio(event.keyCode);
    }

    // 部分ループ再生のステータスを記録
    // オプションで変更可能なキーコード
    // default: R
    if (event.keyCode == settings.partialLoopKeyCode) {
      if (loopStatus === undefined) {
        loopStatus = 0;
      }
      loopStatus++;
      partialLoop();
    }

  });

  // 再生/停止
  function togglePlayAndPause() {
    var player = document.getElementsByTagName('video')[0];
    if (player.paused === true)
      player.play();
    else
      player.pause();
    scrollToPlayer();
  };

  // 数秒巻き戻し
  function rewindTime(event) {
    document.getElementsByTagName('video')[0].currentTime -= settings.skipTimeAmount;
    scrollToPlayer();
  };

  // 数秒早送り
  function advanceTime() {
    document.getElementsByTagName('video')[0].currentTime += settings.skipTimeAmount;
    scrollToPlayer();
  };

  // 動画の最初の位置に移動する
  function jumpToBeginning() {
    var player = document.getElementsByTagName('video')[0];
    player.currentTime = player.seekable.start(0);
    scrollToPlayer();
  };

  // 動画の最後の位置に移動する
  function jumpToEnd() {
    var player = document.getElementsByTagName('video')[0];
    player.currentTime = player.seekable.end(0);
    scrollToPlayer();
  };

  // 数字に対応する割合まで動画を移動する
  function jumpToTimerRatio(timerRatio) {
    var player = document.getElementsByTagName('video')[0];
    timerRatio = (timerRatio - 48) / 10;
    player.currentTime = player.seekable.end(0) * timerRatio;
    scrollToPlayer();
  };

  // 部分ループ再生
  function partialLoop() {
    var player = document.getElementsByTagName('video')[0];
    if (loopStatus === 1) {
      loopStart = player.currentTime;
    }
    else if (loopStatus === 2) {
      if (flag !== 1) {
        loopEnd = player.currentTime;
        flag = 1;
      }
      loopTimeoutID = setTimeout(function() {
        if (player.currentTime >= loopEnd || player.currentTime < loopStart) {
          player.currentTime = loopStart;
        }
        if (loopStatus === 3) {
          clearTimeout(loopTimeoutID);
          loopStatus = 0;
          flag = 0;
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

  // 動画プレイヤーのある位置までスクロールする
  function scrollToPlayer() {
    var player = document.getElementsByTagName('video')[0];
    var rect = player.getBoundingClientRect();
    var positionY = rect.top;
    var dElm = document.documentElement;
    var dBody = document.body;
    var scrollY = dElm.scrollTop || dBody.scrollTop;
    var y = positionY + scrollY - 100;
    window.scrollTo(0, y);
  };

});
