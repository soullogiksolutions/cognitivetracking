// Globals
var useAudio = true;
var startingSpan = 3;
var currentSpan = startingSpan;
var maxSpanPassed = 0;
var spanTrialCount = 0;
var spanCorrectCount = 0;
var fdsTotalTrials = 50; // max span length or trial limit
var response = [];
var stimList = [];
var fds_correct_ans = [];
var folder = "digits/";

var fileMap = {
  1: "one.wav", 2: "two.wav", 3: "three.wav", 4: "four.wav",
  5: "five.wav", 6: "six.wav", 7: "seven.wav", 8: "eight.wav", 9: "nine.wav"
};

function digitToFile(digit) {
  return folder + fileMap[digit];
}

var digit_list = [1,2,3,4,5,6,7,8,9];

// AudioContext for playback
var audioContext;

function shuffle(arr) {
  for(let i=arr.length-1; i>0; i--) {
    let j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDigitList(len) {
  let shuffled = [];
  while(shuffled.length < len) {
    shuffled = [...shuffled, ...shuffle([...digit_list])];
  }
  return shuffled.slice(0,len);
}

function getStimuli(len) {
  let digits = getDigitList(len);
  stimList = digits.map(d => digitToFile(d));
  fds_correct_ans = digits; // save correct sequence
  return stimList;
}

function recordClick(elm) {
  response.push(Number(elm.innerText.trim()));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
}

function clearResponse() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
}

var aud_digits = digit_list.map(digitToFile);

var preload_digits = {
  type: 'preload',
  audio: aud_digits,
};

var fds_welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Audio mode only.</p>
    <p>Max trials: ${fdsTotalTrials}</p>
    <p>Press Continue to start.</p>`,
  choices: ['Continue'],
  on_finish: function() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }
};

var setup_fds = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Span length: ${currentSpan}</p>
            <p>Trial ${spanTrialCount+1} of 2 at this span</p>
            <p>Max span so far: ${maxSpanPassed}</p>`;
  },
  choices: ['Begin'],
  on_finish: function() {
    getStimuli(currentSpan);
    idx = 0;
    exitDigits = false;
    clearResponse();
  }
};

var idx = 0;
var exitDigits = false;

var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 300,
  on_finish: function() {
    idx++;
    if(idx >= stimList.length) exitDigits = true;
  }
};

var digit_loop = {
  timeline: [letter_fds],
  loop_function: function() {
    return !exitDigits;
  }
};

var response_grid = `
<div style="text-align:center;">
  <p>What were the numbers <b>in order</b>?</p>
  ${Array.from({length:9}, (_, i) => `<button class="num-button">${i+1}</button>`).join('')}
  <br><br>
  <button id="clearBtn">Clear</button>
  <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
</div>`;

var fds_response_screen = {
  type: 'html-button-response',
  stimulus: response_grid,
  choices: ['Submit Answer'],
  on_load: function() {
    $('.num-button').click(function() { recordClick(this); });
    $('#clearBtn').click(function() { clearResponse(); });
  },
  on_finish: function() {
    let correct = response.length === fds_correct_ans.length 
                  && response.every((v, i) => v === fds_correct_ans[i]);
    if(correct) {
      spanCorrectCount++;
      maxSpanPassed = Math.max(maxSpanPassed, currentSpan);
    }
    spanTrialCount++;
    if(spanTrialCount >= 2) {
      // After two trials, check if passed span
      if(spanCorrectCount >= 1) {
        currentSpan++; // increase span length
      } else {
        // Task ends after 2 failures at this span
        jsPsych.endExperiment(`Thank you for participating. Your final digit span score is ${maxSpanPassed}.`);
      }
      spanTrialCount = 0;
      spanCorrectCount = 0;
    }
    fdsTrialNum++;
    response = [];
  }
};

vartimeline = [
  preload_digits,
  fds_welcome,
  setup_fds,
  digit_loop,
  fds_response_screen,
];

// Control main looping of trials
var main_loop = {
  timeline: timeline,
  loop_function: function() {
    return (fdsTrialNum < fdsTotalTrials);
  }
};

jsPsych.init({ timeline: [main_loop] });
