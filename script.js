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
    getNextVideoElementKeyCode:         'n',
    partialLoopKeyCode:                 'l',
    partialLoopPrecision:               100,
    skipTimeAmount:                       5,
    playOrPauseWhenLoadingSelect: 'default',
    showOrHideProgressBarSelect:  'default',
    scrollToPlayerChecked:            false,
    rememberPlaybackSpeedChecked:      true,
    playbackSpeed:                      1.0,
  };
  var fixed = {
    // 固定のキーコード
    togglePlayAndPauseKeyCode:  ' ',          // space
    togglePlayAndPauseKeyCode2: 'Enter',      // enter
    rewindTimeKeyCode:          'ArrowLeft',  // left-arrow
    advanceTimeKeyCode:         'ArrowRight', // right-arrow
    isEscape:                   'Escape',     // esc
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
    settings.getNextVideoElementKeyCode   = storage.getNextVideoElementKeyCode;
    settings.partialLoopKeyCode           = storage.partialLoopKeyCode;
    settings.partialLoopPrecision         = Number(storage.partialLoopPrecision);
    settings.skipTimeAmount               = Number(storage.skipTimeAmount);
    settings.playOrPauseWhenLoadingSelect = storage.playOrPauseWhenLoadingSelect;
    settings.showOrHideProgressBarSelect  = storage.showOrHideProgressBarSelect;
    settings.scrollToPlayerChecked        = Boolean(storage.scrollToPlayerChecked);
    settings.rememberPlaybackSpeedChecked = Boolean(storage.rememberPlaybackSpeedChecked);
    settings.playbackSpeed                = Number(storage.playbackSpeed);
    getVideoElement('default');
    observeReadyState()
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
  var playerType = 'video'
  var playerOrder = 0;
  var isSpeedChangedFromThisExtension = false;

  // video要素を取得する
  function getVideoElement(signal) {
    if (document.getElementsByTagName(playerType)[playerOrder] !== undefined) {
      if (document.getElementsByTagName(playerType)[playerOrder].readyState === 4) {
        player = document.getElementsByTagName(playerType)[playerOrder];
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
        adjustVideoPosition();

        if (signal !== 'rehash') {
          if (settings.rememberPlaybackSpeedChecked === true) {
            getPlaybackSpeed();
          }
          else {
            setPlaybackSpeed();
          }

          switch (settings.playOrPauseWhenLoadingSelect) {
            case 'play':  player.play();  break;
            case 'pause': player.pause(); break;
          }
        }

        return false;
      }
    }

    if (player === undefined) {
      getVideoTimeoutID = setTimeout(function() {
        // Some video sites has several video elements which are invisible
        // and are never ready ("readyState" is always "0").
        // If the first video element (0th element) on that page is never ready,
        // it cannot take the actual video element (visible video’s element),
        // so it searches all video elements in order until the actual video element are found.
        getNextVideoElement();
      }, 200);
    }
  }

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

  function showAndHideProgressBar(signal) {
    try {
      clearTimeout(hideProgressBarTimeoutID);
    }
    catch (err) {
      // Uncomment when debugging.
      // console.warn('Failed to clear hideProgressBarTimeoutID. But continuing.');
    }

    showProgressBar(signal);

    hideProgressBarTimeoutID = setTimeout(function() {
      hideProgressBar(signal);
      clearTimeout(hideProgressBarTimeoutID);
    }, 3000);
  }

  function showProgressBar(signal) {
    if (settings.showOrHideProgressBarSelect === 'hide' && signal !== 'force') {
      return false;
    }

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

    adjustVideoPositionJustOneTime();

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
      var progressBufferedRate = (getBufferedPosition() / player.seekable.end(0)) * 100;
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
    // if (!player.paused || settings.showOrHideProgressBarSelect === 'show') {
      showProgressBarTimeoutID = setTimeout(function() {
        showProgressBar(signal);
      }, 200);
    // }
  }

  function adjustVideoPosition() {
    setAdjustVideoPosition();

    adjustVideoPositionTImeoutID = setTimeout(function() {
      clearTimeout(setAdjustVideoPositionTimeoutID);
    }, 3000);
  }

  function setAdjustVideoPosition() {
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

    setAdjustVideoPositionTimeoutID = setTimeout(function() {
      setAdjustVideoPosition();
    }, 200);
  }

  function adjustVideoPositionJustOneTime() {
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
    if (settings.showOrHideProgressBarSelect === 'show' && signal !== 'force') {
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

    adjustVideoPosition();
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
      showProgressBar('force');
    }

    // "Show or hide progress bar" オプションの設定/解除
    // ここで設定/解除しても記録はされないので
    // 記録したい場合はオプションページで変更する
    // 一時的にプログレスバーの固定/解除したいときに使用する
    if (eventKey == '.') {
      event.stopPropagation();

      // Rotate showOrHideProgressBarSelect value
      // 'default' => 'show'
      // 'show'    => 'hide'
      // 'hide'    => 'default'
      switch (settings.showOrHideProgressBarSelect) {
        case 'default': settings.showOrHideProgressBarSelect = 'show';    break;
        case 'show':    settings.showOrHideProgressBarSelect = 'hide';    break;
        case 'hide':    settings.showOrHideProgressBarSelect = 'default'; break;
      }

      switch (settings.showOrHideProgressBarSelect) {
        case 'default': hideProgressBar(); showVideoDebuggingStatus('Bar Released'); break;
        case 'show':    showProgressBar(); showVideoDebuggingStatus('Bar Shown');    break;
        case 'hide':    hideProgressBar(); showVideoDebuggingStatus('Bar Hiden');    break;
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
    if ((document.activeElement.nodeName             === 'INPUT'
    &&   document.activeElement.getAttribute('type') !== 'range')
    ||   document.activeElement.nodeName             === 'TEXTAREA'
    ||   document.activeElement.getAttribute('type') === 'text'
    ||   document.activeElement.isContentEditable    === true)
    {
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

    // default: N
    if (event.shiftKey && eventKey === settings.getNextVideoElementKeyCode.toUpperCase()) {
      getPrevVideoElement();
    }

    // 修飾キーをエスケープ
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return false;
    }

    stopOriginalListener(event, 'keydown');

    // ショートカットキーから関数を呼び出す
    switch (eventKey) {
      // オプションのキーコード
      case settings.togglePlayAndPauseKeyCode:  togglePlayAndPause();                           break;  // default: p
      case settings.jumpToBeginningKeyCode:     jumpToBeginning();    showAndHideProgressBar(); break;  // default: h
      case settings.jumpToEndKeyCode:           jumpToEnd();          showAndHideProgressBar(); break;  // default: e
      case settings.rewindTimeKeyCode:          rewindTime();         showAndHideProgressBar(); break;  // default: a
      case settings.advanceTimeKeyCode:         advanceTime();        showAndHideProgressBar(); break;  // default: s
      case settings.speedDownKeyCode:           speedDown();                                    break;  // default: d
      case settings.speedUpKeyCode:             speedUp();                                      break;  // default: u
      case settings.resetSpeedKeyCode:          resetSpeed();                                   break;  // default: r
      case settings.toggleFullscreenKeyCode:    toggleFullscreen();                             break;  // default: f
      case settings.getNextVideoElementKeyCode: getNextVideoElement();                          break;  // default: n
      // 固定のキーコード
      case fixed.togglePlayAndPauseKeyCode:  event.preventDefault(); togglePlayAndPause();                           break;  // space
      case fixed.togglePlayAndPauseKeyCode2: event.preventDefault(); togglePlayAndPause();                           break;  // enter
      case fixed.rewindTimeKeyCode:          event.preventDefault(); rewindTime();         showAndHideProgressBar(); break;  // left-arrow
      case fixed.advanceTimeKeyCode:         event.preventDefault(); advanceTime();        showAndHideProgressBar(); break;  // right-arrow
      case fixed.isEscape:                                           resetLoopStatus();                              break;  // esc
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
      showAndHideProgressBar('force');
    }
  }, true);

  window.addEventListener('keypress', function(event) {
    if (player === undefined) {
      return false;
    }

    stopOriginalListener(event, 'keypress');
  }, true);

  // Originally "onreadystatechange" should be used, but it does not work for some reason
  function observeReadyState() {
    setTimeout(() => {
      if (player === undefined || player.readyState !== 4) {
        getNextVideoElement()
      }

      observeReadyState()
    }, 5000)
  }

  function observeSpeed() {
    player.onratechange = function() {
      if (isSpeedChangedFromThisExtension === false) {
        getPlaybackSpeed();
        statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
      }
      isSpeedChangedFromThisExtension = false;
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
    chrome.storage.sync.get(settings, function(storage) {
      player.playbackRate = floorFormat(Number(storage.playbackSpeed), 1);
    });
  }

  // 再生速度を保存する
  function setPlaybackSpeed() {
    chrome.storage.sync.set({
      playbackSpeed: Number(floorFormat(player.playbackRate, 1))
    }, function() {
      statusBox('playbackRate', adjustSpeedStatus(player.playbackRate));
    });
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
    if (isNetflix()) {
      injectOperationForNetflix(`player.seek(player.getCurrentTime() - ${settings.skipTimeAmount} * 1000)`)
    }
    else {
      player.currentTime -= settings.skipTimeAmount;
    }
  };

  // 数秒早送り
  function advanceTime() {
    player.currentTime += settings.skipTimeAmount;
  };

  // 再生スピードダウン
  function speedDown() {
    player.playbackRate = floorFormat((player.playbackRate - 0.09), 1);
    setSpeedRange(player.playbackRate);
    setPlaybackSpeed();
    isSpeedChangedFromThisExtension = true;
  }

  // 再生スピードアップ
  function speedUp() {
    player.playbackRate = floorFormat((player.playbackRate + 0.11), 1);
    setSpeedRange(player.playbackRate);
    setPlaybackSpeed();
    isSpeedChangedFromThisExtension = true;
  }

  // 再生スピードリセット
  function resetSpeed() {
    player.playbackRate = 1.0;
    setPlaybackSpeed();
    isSpeedChangedFromThisExtension = true;
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

  function getNextVideoElement() {
    playerOrder++

    if (playerOrder >= document.querySelectorAll(playerType).length) {
      playerOrder = 0

      if (playerType === 'video' && document.querySelectorAll('audio').length !== 0) {
        playerType = 'audio'
      }
      else if (playerType === 'audio' && document.querySelectorAll('video').length !== 0) {
        playerType = 'video'
      }
    }

    getVideoElement('next');
  }

  function getPrevVideoElement() {
    playerOrder--

    if (playerOrder < 0) {
      if (playerType === 'video' && document.querySelectorAll('audio').length !== 0) {
        playerType = 'audio'
      }
      else if (playerType === 'audio' && document.querySelectorAll('video').length !== 0) {
        playerType = 'video'
      }

      playerOrder = document.querySelectorAll(playerType).length - 1
    }

    getVideoElement('prev');
  }

  // 動画の最初の位置に移動する
  function jumpToBeginning() {
    if (isNetflix()) {
      injectOperationForNetflix('player.seek(0)')
    }
    else {
      player.currentTime = player.seekable.start(0);
    }
  };

  // 動画の最後の位置に移動する
  function jumpToEnd() {
    if (isNetflix()) {
      injectOperationForNetflix(`player.seek(${player.seekable.end(0) * 1000})`)
    }
    else {
      player.currentTime = player.seekable.end(0);
    }
  };

  // 数字に対応する割合まで動画を移動する
  function jumpToTimerRatio(timerRatio) {
    timerRatio = Number(timerRatio) / 10;

    if (isNetflix()) {
      injectOperationForNetflix(`player.seek(${player.seekable.end(0) * timerRatio * 1000})`)
    }
    else {
      player.currentTime = player.seekable.end(0) * timerRatio;
    }
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
          if (isNetflix()) {
            injectOperationForNetflix(`player.seek(${loopStart} * 1000)`)
          }
          else {
            player.currentTime = loopStart;
          }
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

  // This function must not be called from onratechange
  // because some video websites keep putting playbackRate
  // to being out of range.
  //
  // For example, U-NEXT keeps setting playbackRate as 0
  // until the video loading is over in jumping to other
  // playback position using a seek bar.
  // Then this function is called infinitely and
  // the browser tab gives no response.
  //
  // 再生スピードの上限と下限を設定する
  function setSpeedRange(speedChecker) {
    if (speedChecker < 0.1) {
      player.playbackRate = 0.1
    }
    else if (speedChecker > 16.0) {
      player.playbackRate = 16.0
    }
  };

  // 表示される再生スピードを調整する
  function adjustSpeedStatus(speedStatus) {
    if (speedStatus < 0.1) {
      speedStatus = 0.1
    }
    else if (speedStatus > 16.0) {
      speedStatus = 16.0
    }
    return speedStatus.toFixed(1);
  };

  // Get the correct buffered position
  //
  // player.buffered.end(0) is not always the correct buffered position
  // because buffered positions are sometimes divided into pieces.
  function getBufferedPosition() {
    for (var i = 0; i < player.buffered.length; i++) {
      if (player.currentTime > player.buffered.start(i) && player.currentTime < player.buffered.end(i)) {
        return player.buffered.end(i);
      }
    }

    // this must not be executed because
    // this function must return the value
    // during the above for loop.
    // something went wrong if this is executed.
    return 0;
  }

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

  function isNetflix() {
    return !!window.location.hostname.match(/netflix.com$/)
  }

  // Inject the code to the page
  //   https://github.com/laurens94/netflix-rewind-browser-extension/blob/d6f2eace176f290b2e090739ebeb289356ca3201/netflix-rewind-1-sec.js#L87-L92
  function injectOperationForNetflix(operation) {
    const script = document.createElement('script')
    script.text = `(${scriptForNetflix.toString().replaceAll('injectedOperation', operation)})();`
    document.documentElement.appendChild(script)
  }

  // https://github.com/noraworld/scraps/issues/21
  function scriptForNetflix() {
    const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer
    const playerSessionId = videoPlayer.getAllPlayerSessionIds()[0]
    // "player" is used inside "injectedOperation" below after injected
    const player = videoPlayer.getVideoPlayerBySessionId(playerSessionId)

    injectedOperation // This is replaced with some operation via "injectOperationForNetflix" function

    // Keep video paused if operated while video is paused
    // I'm not sure why I don't have to check whether a video is paused 🤔
    player.pause()
  }

});
