$(function() {

  var settings = {
    // オプションで変更可能なキーコード
    togglePlayAndPauseKeyCode:          'p',
    jumpToBeginningKeyCode:             'h',
    jumpToEndKeyCode:                   'e',
    rewindTimeKeyCode:                  'a',
    advanceTimeKeyCode:                 's',
    speedDownKeyCode:                   'd',
    speedUpKeyCode:                     'u',
    resetSpeedKeyCode:                  'r',
    toggleFullscreenKeyCode:            'f',
    partialLoopKeyCode:                 'l',
    partialLoopPrecision:               100,
    skipTimeAmount:                       5,
    playOrPauseWhenLoadingSelect: 'default',
    scrollToPlayerChecked:            false,
    rememberPlaybackSpeedChecked:      true,
    alwaysShowProgressBarChecked:     false,
    playbackSpeed:                      1.0,
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
    settings.toggleFullscreenKeyCode      = storage.toggleFullscreenKeyCode;
    settings.partialLoopKeyCode           = storage.partialLoopKeyCode;
    settings.partialLoopPrecision         = Number(storage.partialLoopPrecision);
    settings.skipTimeAmount               = Number(storage.skipTimeAmount);
    settings.playOrPauseWhenLoadingSelect = storage.playOrPauseWhenLoadingSelect;
    settings.scrollToPlayerChecked        = Boolean(storage.scrollToPlayerChecked);
    settings.rememberPlaybackSpeedChecked = Boolean(storage.rememberPlaybackSpeedChecked);
    settings.alwaysShowProgressBarChecked = Boolean(storage.alwaysShowProgressBarChecked);
    settings.playbackSpeed                = Number(storage.playbackSpeed);
    getVideoElement('default');
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
  var videoWidth;
  var videoHeight;
  var videoTop;
  var videoLeft;
  var videoPos;
  var domainName = location.href.match(/^(.*?:\/\/)(.*?)([a-z0-9][a-z0-9\-]{1,63}\.[a-z\.]{2,6})[\:[0-9]*]?([\/].*?)?$/i)[3];

  // video要素を取得する
  function getVideoElement(signal) {
    if (document.getElementsByTagName('video')[0] !== undefined) {
      if (document.getElementsByTagName('video')[0].readyState === 4) {
        player = document.getElementsByTagName('video')[0];
        createNotFullscreenVideoWrapper();
        createFullscreenVideoWrapper();

        if (document.webkitFullscreenElement === document.querySelector('.videocommander-fake-video-wrapper.videocommander-fullscreen')) {
          enableFullscreenProgressBar();
        }
        else {
          enableNotFullscreenProgressBar();
        }

        try {
          clearTimeout(getVideoTimeoutID);
        }
        catch (err) {
          // Uncomment when debugging.
          // console.warn('Failed to clear getVideoTimeoutID. But continuing.');
        }

        observeSpeed();
        observePlayback();
        showAndHideProgressBar();

        if (signal !== 'rehash') {
          getPlaybackSpeed();

          switch (settings.playOrPauseWhenLoadingSelect) {
            case 'play':  player.play();  break;
            case 'pause': player.pause(); break;
          }
        }

        return false;
      }
    }
    getVideoTimeoutID = setTimeout(function() {
      getVideoElement('recursion');
    }, 200);
  };

  // Shown when FULLSCREEN
  function createFullscreenVideoWrapper() {
    if (!($('div').hasClass('videocommander-progress-bar-container-fullscreen'))) {
      var fakeVideoWrapper = '<div class="videocommander-fake-video-wrapper videocommander-fullscreen"></div>';
      $('body').prepend(fakeVideoWrapper);

      var progressBarContainer = '<div class="videocommander-progress-bar-container videocommander-fullscreen videocommander-progress-bar-container-fullscreen"></div>';
      $(progressBarContainer).appendTo('.videocommander-fake-video-wrapper.videocommander-fullscreen');

      var progressBar = '<div class="videocommander-progress-bar videocommander-fullscreen"></div>';
      $(progressBar).appendTo('.videocommander-progress-bar-container.videocommander-fullscreen');

      var progressBufferedBar = '<div class="videocommander-progress-buffered-bar videocommander-fullscreen"></div>';
      $(progressBufferedBar).appendTo('.videocommander-progress-bar-container.videocommander-fullscreen');

      var progressTime = '<div class="videocommander-progress-time videocommander-fullscreen"></div>';
      $(progressTime).appendTo('.videocommander-progress-bar-container.videocommander-fullscreen');

      var entireBar = '<div class="videocommander-entire-bar videocommander-fullscreen"></div>';
      $(entireBar).appendTo('.videocommander-progress-bar-container.videocommander-fullscreen');
    }
  }

  // Shown when NOT FULLSCREEN
  function createNotFullscreenVideoWrapper() {
    if (!($('div').hasClass('videocommander-progress-bar-container-not-fullscreen'))) {
      var fakeVideoWrapper = '<div class="videocommander-fake-video-wrapper videocommander-not-fullscreen"></div>';
      $('body').prepend(fakeVideoWrapper);

      var progressBarContainer = '<div class="videocommander-progress-bar-container videocommander-progress-bar-container-not-fullscreen videocommander-not-fullscreen"></div>';
      $(progressBarContainer).appendTo('.videocommander-fake-video-wrapper.videocommander-not-fullscreen');

      var progressBar = '<div class="videocommander-progress-bar videocommander-not-fullscreen"></div>';
      $(progressBar).appendTo('.videocommander-progress-bar-container.videocommander-not-fullscreen');

      var progressBufferedBar = '<div class="videocommander-progress-buffered-bar videocommander-not-fullscreen"></div>';
      $(progressBufferedBar).appendTo('.videocommander-progress-bar-container.videocommander-not-fullscreen');

      var progressTime = '<div class="videocommander-progress-time videocommander-not-fullscreen"></div>';
      $(progressTime).appendTo('.videocommander-progress-bar-container.videocommander-not-fullscreen');

      var entireBar = '<div class="videocommander-entire-bar videocommander-not-fullscreen"></div>';
      $(entireBar).appendTo('.videocommander-progress-bar-container.videocommander-not-fullscreen');
    }
  }

  function showAndHideProgressBar() {
    try {
      clearTimeout(hideProgressBarTimeoutID);
    }
    catch (err) {
      // Uncomment when debugging.
      // console.warn('Failed to clear hideProgressBarTimeoutID. But continuing.');
    }

    showProgressBar();

    hideProgressBarTimeoutID = setTimeout(function() {
      hideProgressBar();
      clearTimeout(hideProgressBarTimeoutID);
    }, 3000);
  }

  function showProgressBar() {
    try {
      clearTimeout(showProgressBarTimeoutID);
    }
    catch (err) {
      // Uncomment when debugging.
      // console.warn('Failed to clear showProgressBarTimeoutID. But continuing.');
    }

    if (player.getAttribute('src') === null) {
      hideProgressBar('force');
      return false;
    }

    $('.videocommander-progress-bar-container.enabled').stop();
    $('.videocommander-progress-bar-container.enabled').css('opacity', 1);

    if (document.webkitFullscreenElement === document.querySelector('.videocommander-fake-video-wrapper.videocommander-fullscreen')) {
      $(player).css('left', '0px').css('top', '0px');
    }
    else {
      videoWidth = $(player).css('width');
      videoHeight = $(player).css('height');
      videoTop = $(player).css('top');
      videoLeft = $(player).css('left');
      $('.videocommander-fake-video-wrapper.videocommander-not-fullscreen').css('width', $(player).width()).css('height', $(player).height()).css('left', $(player).offset().left).css('top', $(player).offset().top);
    }

    try {
      var progressRate = (player.currentTime / player.seekable.end(0)) * 100;
      $('.videocommander-progress-bar.enabled').css('width', progressRate + '%');
    }
    catch (err) {
      // This exception rises every time loading new video on YouTube.
      // Uncomment when debugging.
      // console.warn('Failed to load progress rate. But continuing.');
    }

    try {
      var progressBufferedRate = (player.buffered.end(0) / player.seekable.end(0)) * 100;
      $('.videocommander-progress-buffered-bar.enabled').css('width', progressBufferedRate + '%');
    }
    catch (err) {
      // This exception rises every time loading new video on YouTube.
      // Uncomment when debugging.
      // console.warn('Failed to load progress buffered rate. But continuing.');
    }

    try {
      $('.videocommander-progress-time.enabled').text(adjustProgressTime(player.currentTime) + ' / ' + adjustProgressTime(player.seekable.end(0)));
    }
    catch (err) {
      // This exception rises every time loading new video on YouTube.
      // Uncomment when debugging.
      // console.warn('Failed to load progress time. But continuing.');
    }

    // Do not update progress (buffered) rate and progress time (Do not call this function)
    // when video player pauses if uncomment.
    // The reason why stops calling this function when video player pauses is because
    // CPU utilization does not go up unnecessarily.
    //
    // if (!player.paused || settings.alwaysShowProgressBarChecked) {
      showProgressBarTimeoutID = setTimeout(function() {
        showProgressBar();
      }, 200);
    // }
  }

  function adjustProgressTime(time) {
    time = parseInt(time);
    var hours = parseInt(time / 3600);
    var minutes = parseInt((time % 3600) / 60);
    var seconds = parseInt(time % 60);

    if (hours === 0) {
      time = ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);
    }
    else {
      time = ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);
    }

    return time;
  }

  // Set signal 'force' to force hiding progress bar
  function hideProgressBar(signal) {
    if (settings.alwaysShowProgressBarChecked && signal !== 'force') {
      return false;
    }

    try {
      clearTimeout(showProgressBarTimeoutID);
    }
    catch (err) {
      // Uncomment when debugging.
      // console.warn('Failed to clear showProgressBarTimeoutID. But continuing.');
    }

    if (player.paused && signal !== 'force') {
      return false;
    }

    if ($('.videocommander-progress-bar-container.enabled').css('opacity') !== '0') {
      $('.videocommander-progress-bar-container.enabled').animate({
        opacity: 0
      }, 200);
    }
  }

  function enableFullscreenProgressBar() {
    if ($('.videocommander-not-fullscreen').hasClass('enabled')) {
      $('.videocommander-not-fullscreen').removeClass('enabled');
    }
    $('.videocommander-not-fullscreen').css('opacity', 0);
    $('.videocommander-fullscreen').addClass('enabled');
    $('.videocommander-fullscreen').css('opacity', 1);

    // Both video wrapper is always shown
    // to avoid video goes out of sight.
    $('.videocommander-fake-video-wrapper').css('opacity', 1);
  }

  function enableNotFullscreenProgressBar() {
    if ($('.videocommander-fullscreen').hasClass('enabled')) {
      $('.videocommander-fullscreen').removeClass('enabled');
    }
    $('.videocommander-fullscreen').css('opacity', 0);
    $('.videocommander-not-fullscreen').addClass('enabled');
    $('.videocommander-not-fullscreen').css('opacity', 1);

    // Both video wrapper is always shown
    // to avoid video goes out of sight.
    $('.videocommander-fake-video-wrapper').css('opacity', 1);
  }

  window.addEventListener('webkitfullscreenchange', function(event) {
    // Video stops when video element moves to video wrapper for entering full screen mode.
    // So remember that video is playing before video element moves and if video is playing,
    // video plays manually after moving.

    // Remember that video is playing
    var playing = false;
    if (!player.paused) {
      playing = true;
    }

    if (document.webkitFullscreenElement === document.querySelector('.videocommander-fake-video-wrapper.videocommander-fullscreen')) {
      createFullscreenVideoWrapper();
      enableFullscreenProgressBar();

      // Video element moves to video wrapper
      videoPos = player.parentNode;
      var videoWrapper = document.querySelector('.videocommander-fake-video-wrapper.videocommander-fullscreen');
      videoWrapper.insertBefore(player, videoWrapper.firstChild);
    }
    else {
      createNotFullscreenVideoWrapper();
      enableNotFullscreenProgressBar();

      // Video element moves to original position
      videoPos.insertBefore(player, videoPos.firstChild);
    }

    // Video plays manually if video is playing before video element moves
    if (playing) {
      player.play();
    }

    showAndHideProgressBar();
  }, true);

  // キーが押されたかどうかを判定
  window.addEventListener('keydown', function(event) {
    // 円マークをバックスラッシュに変換
    var eventKey = encodeYenSignToBackslash(event.key);

    // escが押されたらアクティブフォーカスを外す
    if (eventKey == fixed.isEscape) {
      activeBlur();
    }

    // 押している間、プログレスバーが表示される
    if (eventKey == ',') {
      event.stopPropagation();
      showProgressBar();
    }

    // "Always show progress bar" オプションの設定/解除
    // ここで設定/解除しても記録はされないので
    // 記録したい場合はオプションページで変更する
    // 一時的にプログレスバーの固定/解除したいときに使用する
    if (eventKey == '.') {
      event.stopPropagation();
      settings.alwaysShowProgressBarChecked = !settings.alwaysShowProgressBarChecked;
      if (settings.alwaysShowProgressBarChecked) {
        showProgressBar();
        showVideoDebuggingStatus('Bar Fixed');
      }
      else {
        hideProgressBar();
        showVideoDebuggingStatus('Bar Released');
      }
    }

    // Ctrl + Shift が押されたら video 要素を取得し直す (試験的機能)
    if (event.ctrlKey && event.shiftKey) {
      getVideoElement('rehash');
      showVideoDebuggingStatus('Rehash');
      console.info('Rehashed video element successfully.\n\nStill have problem? Report that from https://github.com/noraworld/videocommander/issues.\nThank you for cooperating with development!');
    }

    // 動画がないときはキーイベントを実行しない
    if (player === undefined) {
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
      activeBlur();
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

    stopOriginalListener(event, 'keydown');

    // ショートカットキーから関数を呼び出す
    switch (eventKey) {
      // オプションのキーコード
      case settings.togglePlayAndPauseKeyCode: togglePlayAndPause();                           break;  // default: p
      case settings.jumpToBeginningKeyCode:    jumpToBeginning();    showAndHideProgressBar(); break;  // default: h
      case settings.jumpToEndKeyCode:          jumpToEnd();          showAndHideProgressBar(); break;  // default: e
      case settings.rewindTimeKeyCode:         rewindTime();         showAndHideProgressBar(); break;  // default: a
      case settings.advanceTimeKeyCode:        advanceTime();        showAndHideProgressBar(); break;  // default: s
      case settings.speedDownKeyCode:          speedDown();                                    break;  // default: d
      case settings.speedUpKeyCode:            speedUp();                                      break;  // default: u
      case settings.resetSpeedKeyCode:         resetSpeed();                                   break;  // default: r
      case settings.toggleFullscreenKeyCode:   toggleFullscreen();                             break;  // default: f
      // 固定のキーコード
      case fixed.togglePlayAndPauseKeyCode: event.preventDefault(); togglePlayAndPause();                           break;  // space
      case fixed.rewindTimeKeyCode:         event.preventDefault(); rewindTime();         showAndHideProgressBar(); break;  // left-arrow
      case fixed.advanceTimeKeyCode:        event.preventDefault(); advanceTime();        showAndHideProgressBar(); break;  // right-arrow
      case fixed.isEscape:                                          resetLoopStatus();                              break;  // esc
    }

    // 数字のキーを押すとその数字に対応する割合まで動画を移動する
    // キーボードの 3 を押すと動画全体の 30% の位置に移動する
    // 固定のキーコード
    if (eventKey >= '0' && eventKey <= '9') {
      jumpToTimerRatio(eventKey);
      showAndHideProgressBar();
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

  window.addEventListener('keyup', function(event) {
    if (player === undefined) {
      return false;
    }

    stopOriginalListener(event, 'keyup');

    if (event.key == ',') {
      showAndHideProgressBar();
    }
  }, true);

  window.addEventListener('keypress', function(event) {
    if (player === undefined) {
      return false;
    }

    stopOriginalListener(event, 'keypress');
  }, true);

  // 再生スピードの変更を監視する
  function observeSpeed() {
    player.onratechange = function() {
      setSpeedRange(player.playbackRate);
    };
  };

  // 再生/停止の変化を監視する
  function observePlayback() {
    player.onplay = function() {
      showProgressBar();
      hideProgressBar();
    }
    player.onpause = function() {
      if (domainName === 'youtube.com' && player.currentTime === player.seekable.end(0)) {
        hideProgressBar('force');
      }
      else {
        showProgressBar();
      }
    }
  }

  // 前回の再生速度を取得する
  function getPlaybackSpeed() {
    if (settings.rememberPlaybackSpeedChecked === true) {
      player.playbackRate = floorFormat(settings.playbackSpeed, 1);
    }
  }

  // 再生速度を保存する
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

  // 再生 / 停止
  function togglePlayAndPause() {
    if (player.paused) {
      player.play();
    }
    else {
      player.pause();
    }
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

  // フルスクリーン表示 / 解除
  function toggleFullscreen() {
    if (!document.webkitFullscreenElement) {
      document.querySelector('.videocommander-fake-video-wrapper.videocommander-fullscreen').webkitRequestFullscreen();
    }
    else {
      document.webkitExitFullscreen();
    }
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

    $(videoStatus).appendTo('.videocommander-fake-video-wrapper.enabled');

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

  // 動画のステータスを表示する (デバッグ用)
  // 動画プレイヤーの右上に赤い枠で表示される
  function showVideoDebuggingStatus(statusStr) {
    $('.video-debugging-status').remove();
    var videoDebuggingStatus = '<span class="video-debugging-status">' + statusStr + '</span>';
    $(videoDebuggingStatus).appendTo('.videocommander-fake-video-wrapper.enabled');
    $('.video-debugging-status').fadeOut(1000, function() {
      $(this).remove();
    });
  }

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

  // オプションのキーと固定のキーに関しては
  // 元々サイトで実装されているイベントリスナーを
  // 無効化してこちらの処理のみを実行する
  function stopOriginalListener(event, type) {
    var eventKey = encodeYenSignToBackslash(event.key);

    Object.keys(settings).forEach(function(key) {
      if (eventKey == settings[key]) {
        event.stopPropagation();
        if (settings.scrollToPlayerChecked === true && type === 'keydown') {
          scrollToPlayer();
        }
      }
    });

    Object.keys(fixed).forEach(function(key) {
      if (eventKey == fixed[key]) {
        event.stopPropagation();
        if (settings.scrollToPlayerChecked === true && type === 'keydown') {
          scrollToPlayer();
        }
      }
    });
  }

});
