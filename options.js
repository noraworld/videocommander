var defaultKey = {
  togglePlayAndPauseKeyCode: 80,  // default: P
  jumpToBeginningKeyCode:    72,  // defualt: H
  jumpToEndKeyCode:          69,  // default: E
  rewindTimeKeyCode:         37,  // defualt: left-arrow
  advanceTimeKeyCode:        39,  // default: right-arrow
  partialLoopKeyCode:        82,  // default: R
};

$(function() {
  loadOptions();

  $('#save').on('click', saveOptions);
  $('#reset').on('click', resetOptions);

  initInput('toggle-play-and-pause');
  initInput('jump-to-beginning');
  initInput('jump-to-end');
  initInput('rewind-time');
  initInput('advance-time');
  initInput('partial-loop');
});

function loadOptions() {
  chrome.storage.sync.get(defaultKey, function(storage) {
    updateInputText('toggle-play-and-pause', storage.togglePlayAndPauseKeyCode);
    updateInputText('jump-to-beginning',     storage.jumpToBeginningKeyCode);
    updateInputText('jump-to-end',           storage.jumpToEndKeyCode);
    updateInputText('rewind-time',           storage.rewindTimeKeyCode);
    updateInputText('advance-time',          storage.advanceTimeKeyCode);
    updateInputText('partial-loop',          storage.partialLoopKeyCode);
  });
}

function updateInputText(inputID, keyCode) {
  document.getElementById(inputID).value = String.fromCharCode(keyCode).toUpperCase();
  document.getElementById(inputID).keyCode = keyCode;
}

function saveOptions() {
  var togglePlayAndPauseKeyCode = document.getElementById('toggle-play-and-pause').keyCode;
  var jumpToBeginningKeyCode    = document.getElementById('jump-to-beginning').keyCode;
  var jumpToEndKeyCode          = document.getElementById('jump-to-end').keyCode;
  var rewindTimeKeyCode         = document.getElementById('rewind-time').keyCode;
  var advanceTimeKeyCode        = document.getElementById('advance-time').keyCode;
  var partialLoopKeyCode        = document.getElementById('partial-loop').keyCode;

  togglePlayAndPauseKeyCode = isNaN(togglePlayAndPauseKeyCode) ? defaultKey.togglePlayAndPauseKeyCode : togglePlayAndPauseKeyCode;
  jumpToBeginningKeyCode    = isNaN(jumpToBeginningKeyCode)    ? defaultKey.jumpToBeginningKeyCode    : jumpToBeginningKeyCode;
  jumpToEndKeyCode          = isNaN(jumpToEndKeyCode)          ? defaultKey.jumpToEndKeyCode          : jumpToEndKeyCode;
  rewindTimeKeyCode         = isNaN(rewindTimeKeyCode)         ? defaultKey.rewindTimeKeyCode         : rewindTimeKeyCode;
  advanceTimeKeyCode        = isNaN(advanceTimeKeyCode)        ? defaultKey.advanceTimeKeyCode        : advanceTimeKeyCode;
  partialLoopKeyCode        = isNaN(partialLoopKeyCode)        ? defaultKey.partialLoopKeyCode        : partialLoopKeyCode;

  chrome.storage.sync.set({
    togglePlayAndPauseKeyCode: togglePlayAndPauseKeyCode,
    jumpToBeginningKeyCode:    jumpToBeginningKeyCode,
    jumpToEndKeyCode:          jumpToEndKeyCode,
    rewindTimeKeyCode:         rewindTimeKeyCode,
    advanceTimeKeyCode:        advanceTimeKeyCode,
    partialLoopKeyCode:        partialLoopKeyCode
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
    var status = $('#status');
    status.text('Reset');
    setTimeout(function() {
      status.text('');
    }, 1500);
  });
}

function initInput(inputID) {
  document.getElementById(inputID).addEventListener('focus', inputFocus);
  document.getElementById(inputID).addEventListener('blur', inputBlur);
  document.getElementById(inputID).addEventListener('keydown', recordKeydown);
}

function inputFocus(event) {
  event.target.value = '';
};

function inputBlur(event) {
  event.target.value = String.fromCharCode(event.target.keyCode).toUpperCase();
}

function recordKeydown(event) {
  var nomalizedChar = String.fromCharCode(event.keyCode).toUpperCase();
  event.target.value = nomalizedChar;
  event.target.keyCode = nomalizedChar.charCodeAt();
  event.preventDefault();
  event.stopPropagation();
}
