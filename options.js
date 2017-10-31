var defaultKey = {
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
};

$(function() {
  loadOptions();

  $('#save').on('click', saveOptions);
  $('#reset').on('click', resetOptions);

  initShortcutInput('toggle-play-and-pause');
  initShortcutInput('jump-to-beginning');
  initShortcutInput('jump-to-end');
  initShortcutInput('rewind-time');
  initShortcutInput('advance-time');
  initShortcutInput('speed-down');
  initShortcutInput('speed-up');
  initShortcutInput('reset-speed');
  initShortcutInput('toggle-fullscreen');
  initShortcutInput('partial-loop');

  initNumericInput('partial-loop-precision');
  initNumericInput('skip-time-amount');
});

function loadOptions() {
  chrome.storage.sync.get(defaultKey, function(storage) {
    // key
    updateInputText('toggle-play-and-pause', storage.togglePlayAndPauseKeyCode);
    updateInputText('jump-to-beginning',     storage.jumpToBeginningKeyCode);
    updateInputText('jump-to-end',           storage.jumpToEndKeyCode);
    updateInputText('rewind-time',           storage.rewindTimeKeyCode);
    updateInputText('advance-time',          storage.advanceTimeKeyCode);
    updateInputText('speed-down',            storage.speedDownKeyCode);
    updateInputText('speed-up',              storage.speedUpKeyCode);
    updateInputText('reset-speed',           storage.resetSpeedKeyCode);
    updateInputText('toggle-fullscreen',     storage.toggleFullscreenKeyCode);
    updateInputText('partial-loop',          storage.partialLoopKeyCode);

    // numeric
    document.getElementById('partial-loop-precision').value = storage.partialLoopPrecision;
    document.getElementById('skip-time-amount').value = storage.skipTimeAmount;

    // select menu
    document.getElementById('play-or-pause-when-loading').value = storage.playOrPauseWhenLoadingSelect;

    // check box
    document.getElementById('scroll-to-player').checked = storage.scrollToPlayerChecked;
    document.getElementById('remember-playback-speed').checked = storage.rememberPlaybackSpeedChecked;
    document.getElementById('always-show-progress-bar').checked = storage.alwaysShowProgressBarChecked;
  });
}

function updateInputText(inputID, keyCode) {
  document.getElementById(inputID).value = keyCode;
  document.getElementById(inputID).keyCode = keyCode;
}

function saveOptions() {
  var togglePlayAndPauseKeyCode    = document.getElementById('toggle-play-and-pause').value;
  var jumpToBeginningKeyCode       = document.getElementById('jump-to-beginning').value;
  var jumpToEndKeyCode             = document.getElementById('jump-to-end').value;
  var rewindTimeKeyCode            = document.getElementById('rewind-time').value;
  var advanceTimeKeyCode           = document.getElementById('advance-time').value;
  var speedDownKeyCode             = document.getElementById('speed-down').value;
  var speedUpKeyCode               = document.getElementById('speed-up').value;
  var resetSpeedKeyCode            = document.getElementById('reset-speed').value;
  var toggleFullscreenKeyCode      = document.getElementById('toggle-fullscreen').value;
  var partialLoopKeyCode           = document.getElementById('partial-loop').value;
  var partialLoopPrecision         = document.getElementById('partial-loop-precision').value;
  var skipTimeAmount               = document.getElementById('skip-time-amount').value;
  var playOrPauseWhenLoadingSelect = document.getElementById('play-or-pause-when-loading').value;
  var scrollToPlayerChecked        = document.getElementById('scroll-to-player').checked;
  var rememberPlaybackSpeedChecked = document.getElementById('remember-playback-speed').checked;
  var alwaysShowProgressBarChecked = document.getElementById('always-show-progress-bar').checked;

  var validateFlag = [];
  validateFlag[0]  = checkValidate('toggle-play-and-pause');
  validateFlag[1]  = checkValidate('jump-to-beginning');
  validateFlag[2]  = checkValidate('jump-to-end');
  validateFlag[3]  = checkValidate('rewind-time');
  validateFlag[4]  = checkValidate('advance-time');
  validateFlag[5]  = checkValidate('speed-down');
  validateFlag[6]  = checkValidate('speed-up');
  validateFlag[7]  = checkValidate('reset-speed');
  validateFlag[8]  = checkValidate('toggle-fullscreen');
  validateFlag[9]  = checkValidate('partial-loop');
  validateFlag[10] = checkValidateNumeric('partial-loop-precision');
  validateFlag[11] = checkValidateNumeric('skip-time-amount');
  validateFlag[12] = checkValidateSelect('play-or-pause-when-loading', ['default', 'play', 'pause']);
  validateFlag[13] = checkValidateChecked('scroll-to-player');
  validateFlag[14] = checkValidateChecked('remember-playback-speed');
  validateFlag[15] = checkValidateChecked('always-show-progress-bar');

  // when some input is wrong.
  for (var i = 0; i < validateFlag.length; i++) {
    if (validateFlag[i] === false) {
      return false;
    }
  }

  chrome.storage.sync.set({
    togglePlayAndPauseKeyCode:    togglePlayAndPauseKeyCode,
    jumpToBeginningKeyCode:       jumpToBeginningKeyCode,
    jumpToEndKeyCode:             jumpToEndKeyCode,
    rewindTimeKeyCode:            rewindTimeKeyCode,
    advanceTimeKeyCode:           advanceTimeKeyCode,
    speedDownKeyCode:             speedDownKeyCode,
    speedUpKeyCode:               speedUpKeyCode,
    resetSpeedKeyCode:            resetSpeedKeyCode,
    toggleFullscreenKeyCode:      toggleFullscreenKeyCode,
    partialLoopKeyCode:           partialLoopKeyCode,
    partialLoopPrecision:         partialLoopPrecision,
    skipTimeAmount:               skipTimeAmount,
    playOrPauseWhenLoadingSelect: playOrPauseWhenLoadingSelect,
    scrollToPlayerChecked:        scrollToPlayerChecked,
    rememberPlaybackSpeedChecked: rememberPlaybackSpeedChecked,
    alwaysShowProgressBarChecked: alwaysShowProgressBarChecked
  }, function() {
    var status = $('#status');
    status.text('Saved');
    setTimeout(function() {
      status.text('');
    }, 1500);
  });
}

function resetOptions() {
  chrome.storage.sync.set(defaultKey, function() {
    loadOptions();

    // reset error marks
    for (var i = 0; i < $('input').length; i++) {
      $('input').eq(i).parent().children('.invalid-value').remove();
      $('input').eq(i).css('border', '1px solid #cccccc');
    }

    var status = $('#status');
    status.text('Reset');
    setTimeout(function() {
      status.text('');
    }, 1500);
  });
}

function initShortcutInput(inputID) {
  document.getElementById(inputID).addEventListener('focus',    inputFocus);
  document.getElementById(inputID).addEventListener('blur',     inputBlur);
  document.getElementById(inputID).addEventListener('keypress', recordKeypress);
}

function initNumericInput(inputID) {
  document.getElementById(inputID).addEventListener('focus', function() {
    $(this).css('border', '1px solid #cccccc');
  });
}

function inputFocus(event) {
  event.target.value = '';
  $(this).css('border', '1px solid #cccccc');
};

function inputBlur(event) {
  event.target.value = event.target.keyCode;
}

function recordKeypress(event) {
  var nomalizedChar = encodeYenSignToBackslash(event.key);
  event.target.value = nomalizedChar;
  event.target.keyCode = nomalizedChar;
  event.preventDefault();
  event.stopPropagation();
}

function encodeYenSignToBackslash(key) {
  // 165 -> Yen Sign
  if (key.charCodeAt() == 165) {
    key = '\\';
  }
  return key;
}

function checkValidate(inputID) {
  var inputID = '#' + inputID;
  $(inputID).parent().children('.invalid-value').remove();
  if ($(inputID).val().match(/^[0-9a-zA-Z-^\\@\[\];:,./_=~|`{}+*<>?!"#$%&'()]{1}$/) === null && $(inputID).val().match(/^Enter$/) === null) {
    // some input is wrong.
    $(inputID).css('border', '1px solid red');
    $(inputID).parent().append('<div class="invalid-value">Invalid value</div>');
    var errorFlag = true;
  } else {
    $(inputID).css('border', '1px solid #cccccc');
  }

  // return value: true -> save the options, false -> do not save.
  if (errorFlag === true) {
    return false;
  } else {
    return true;
  }
}

function checkValidateNumeric(inputID) {
  var inputID = '#' + inputID;
  $(inputID).parent().children('.invalid-value').remove();
  if ($(inputID).val().match(/^[0-9]+$/) === null) {
    // numeric pattern is wrong.
    $(inputID).css('border', '1px solid red');
    $(inputID).parent().append('<div class="invalid-value">Invalid value</div>');
    var errorFlag = true;
  } else {
    $(inputID).css('border', '1px solid #cccccc');
  }

  // return value: true -> save the options, false -> do not save.
  if (errorFlag === true) {
    return false;
  } else {
    return true;
  }
}

function checkValidateChecked(inputID) {
  var inputID = '#' + inputID;
  $(inputID).parent().children('.invalid-value').remove();
  if ($(inputID).prop('checked') !== true && $(inputID).prop('checked') !== false) {
    // checkbox value is wrong
    $(inputID).css('border', '1px solid red');
    $(inputID).parent().append('<div class="invalid-value">Invalid value</div>');
    var errorFlag = true;
  } else {
    $(inputID).css('border', '1px solid #cccccc');
  }

  // return value: true -> save the options, false -> do not save.
  if (errorFlag === true) {
    return false;
  } else {
    return true;
  }
}

function checkValidateSelect(inputID, menu) {
  var inputID = '#' + inputID;
  $(inputID).parent().children('.invalid-value').remove();
  if (menu.includes($(inputID).val())) {
    $(inputID).css('border', '1px solid #cccccc');
    return true;
  }
  else {
    $(inputID).css('border', '1px solid red');
    $(inputID).parent().append('<div class="invalid-value">Invalid value</div>');
    return false;
  }
}
