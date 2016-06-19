var defaultKey = {
  togglePlayAndPauseKeyCode: 112,  // default: p
  jumpToBeginningKeyCode:    104,  // defualt: h
  jumpToEndKeyCode:          101,  // default: e
  rewindTimeKeyCode:          97,  // defualt: a
  advanceTimeKeyCode:        115,  // default: s
  speedDownKeyCode:          100,  // default: d
  speedUpKeyCode:            117,  // default: u
  resetSpeedKeyCode:         114,  // default: r
  partialLoopKeyCode:        108,  // default: l
  skipTimeAmount:              5,  // default: 5 sec
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
  initShortcutInput('partial-loop');

  initNumericInput('skip-time-amount');
});

function loadOptions() {
  chrome.storage.sync.get(defaultKey, function(storage) {
    updateInputText('toggle-play-and-pause', storage.togglePlayAndPauseKeyCode);
    updateInputText('jump-to-beginning',     storage.jumpToBeginningKeyCode);
    updateInputText('jump-to-end',           storage.jumpToEndKeyCode);
    updateInputText('rewind-time',           storage.rewindTimeKeyCode);
    updateInputText('advance-time',          storage.advanceTimeKeyCode);
    updateInputText('speed-down',            storage.speedDownKeyCode);
    updateInputText('speed-up',              storage.speedUpKeyCode);
    updateInputText('reset-speed',           storage.resetSpeedKeyCode);
    updateInputText('partial-loop',          storage.partialLoopKeyCode);
    document.getElementById('skip-time-amount').value = storage.skipTimeAmount;
  });
}

function updateInputText(inputID, keyCode) {
  document.getElementById(inputID).value = String.fromCharCode(keyCode);
  document.getElementById(inputID).keyCode = keyCode;
}

function saveOptions() {
  var togglePlayAndPauseKeyCode = document.getElementById('toggle-play-and-pause').keyCode;
  var jumpToBeginningKeyCode    = document.getElementById('jump-to-beginning').keyCode;
  var jumpToEndKeyCode          = document.getElementById('jump-to-end').keyCode;
  var rewindTimeKeyCode         = document.getElementById('rewind-time').keyCode;
  var advanceTimeKeyCode        = document.getElementById('advance-time').keyCode;
  var speedDownKeyCode          = document.getElementById('speed-down').keyCode;
  var speedUpKeyCode            = document.getElementById('speed-up').keyCode;
  var resetSpeedKeyCode         = document.getElementById('reset-speed').keyCode;
  var partialLoopKeyCode        = document.getElementById('partial-loop').keyCode;
  var skipTimeAmount            = document.getElementById('skip-time-amount').value;

  togglePlayAndPauseKeyCode = isNaN(togglePlayAndPauseKeyCode) ? defaultKey.togglePlayAndPauseKeyCode : togglePlayAndPauseKeyCode;
  jumpToBeginningKeyCode    = isNaN(jumpToBeginningKeyCode)    ? defaultKey.jumpToBeginningKeyCode    : jumpToBeginningKeyCode;
  jumpToEndKeyCode          = isNaN(jumpToEndKeyCode)          ? defaultKey.jumpToEndKeyCode          : jumpToEndKeyCode;
  rewindTimeKeyCode         = isNaN(rewindTimeKeyCode)         ? defaultKey.rewindTimeKeyCode         : rewindTimeKeyCode;
  advanceTimeKeyCode        = isNaN(advanceTimeKeyCode)        ? defaultKey.advanceTimeKeyCode        : advanceTimeKeyCode;
  speedDownKeyCode          = isNaN(speedDownKeyCode)          ? defaultKey.speedDownKeyCode          : speedDownKeyCode;
  speedUpKeyCode            = isNaN(speedUpKeyCode)            ? defaultKey.speedUpKeyCode            : speedUpKeyCode;
  resetSpeedKeyCode         = isNaN(resetSpeedKeyCode)         ? defaultKey.resetSpeedKeyCode         : resetSpeedKeyCode;
  partialLoopKeyCode        = isNaN(partialLoopKeyCode)        ? defaultKey.partialLoopKeyCode        : partialLoopKeyCode;
  skipTimeAmount            = isNaN(skipTimeAmount)            ? defaultKey.skipTimeAmount            : Number(skipTimeAmount);

  var validateFlag = [];
  validateFlag[0] = checkValidate('toggle-play-and-pause');
  validateFlag[1] = checkValidate('jump-to-beginning');
  validateFlag[2] = checkValidate('jump-to-end');
  validateFlag[3] = checkValidate('rewind-time');
  validateFlag[4] = checkValidate('advance-time');
  validateFlag[5] = checkValidate('speed-down');
  validateFlag[6] = checkValidate('speed-up');
  validateFlag[7] = checkValidate('reset-speed');
  validateFlag[8] = checkValidate('partial-loop');
  validateFlag[9] = checkValidateNumeric('skip-time-amount');

  // when some input is wrong.
  for (var i = 0; i < validateFlag.length; i++) {
    if (validateFlag[i] === false) {
      return false;
    }
  }

  chrome.storage.sync.set({
    togglePlayAndPauseKeyCode: togglePlayAndPauseKeyCode,
    jumpToBeginningKeyCode:    jumpToBeginningKeyCode,
    jumpToEndKeyCode:          jumpToEndKeyCode,
    rewindTimeKeyCode:         rewindTimeKeyCode,
    advanceTimeKeyCode:        advanceTimeKeyCode,
    speedDownKeyCode:          speedDownKeyCode,
    speedUpKeyCode:            speedUpKeyCode,
    resetSpeedKeyCode:         resetSpeedKeyCode,
    partialLoopKeyCode:        partialLoopKeyCode,
    skipTimeAmount:            skipTimeAmount
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
  event.target.value = String.fromCharCode(event.target.keyCode);
}

function recordKeypress(event) {
  var nomalizedChar = String.fromCharCode(event.keyCode);
  event.target.value = nomalizedChar;
  event.target.keyCode = nomalizedChar.charCodeAt();
  event.preventDefault();
  event.stopPropagation();
}

function checkValidate(inputID) {
  var inputID = '#' + inputID;
  $(inputID).parent().children('.invalid-value').remove();
  if ($(inputID).val().match(/^[0-9a-zA-Z-^\\@\[\];:,./_=~|`{}+*<>?!"#$%&'()]{1}$/) === null) {
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
