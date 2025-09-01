// Globals
var folder = "digits/";  // audio files folder
var fileMap = {
  1: "one.wav", 2: "two.wav", 3: "three.wav", 4: "four.wav",
  5: "five.wav", 6: "six.wav", 7: "seven.wav", 8: "eight.wav", 9: "nine.wav"
};

var startingSpan = 3;
var maxSpan = 9; // maximum span length allowed
var currentSpan = startingSpan;
var spanTrialCount = 0;      // how many trials done at current span length (max 2)
var spanCorrectCount = 0;    // how many of the 2 trials were correct
var maxSpanPassed = 0;       // highest span length where at least one trial correct
var response = [];
var stimList = [];
var fds_correct_ans = [];
var trialTotalCount = 0;     // counts total number of trials completed

// Create or resume AudioContext on first interaction
var audioContext;

function digitToFile(digit) {
  return folder + fileMap[digit];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDigitList(len) {
  let arr = [];
  while (arr.length < len) {
    arr = arr.concat(shuffle([...Array(9).keys()].map(x => x + 1)));
  }
  return arr.slice(0,len);
}

function getStimuli(len) {
  let digits = getDigitList(len);
  stimList = digits.map(d => digitToFile(d));
  fds_correct_ans = digits;
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

// Preload all digit audio files for speed
var aud_digits = Object.values(fileMap).map(filename => folder + filename);
var preload_digits = {
  type: 'preload',
  audio: aud_digits,
};

var fds_welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Audio mode only</p>
    <p>Press Continue to start.</p>
  `,
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

var idx = 0;
var exitDigits = false;

var setup_fds = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Trial ${spanTrialCount + 1} of 2 at span length: ${currentSpan}</p>
            <p>Max span passed: ${maxSpanPassed}</p>`;
  },
  choices: ['Begin'],
  on_finish: function() {
    getStimuli(currentSpan);
    idx = 0;
    exitDigits = false;
    clearResponse();
  }
};

var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 300,
  on_finish: function() {
    idx++;
    if (idx >= stimList.length) exitDigits = true;
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
  ${Array.from({length:9},(_,i) => `<button class="num-button">${i+1}</button>`).join('')}
  <br><br>
  <button id="clearBtn">Clear</button>
  <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
</div>
`;

var fds_response_screen = {
  type: 'html-button-response',
  stimulus: response_grid,
  choices: ['Submit Answer'],
  on_load: function() {
    $('.num-button').click(function() { recordClick(this); });
    $('#clearBtn').click(function() { clearResponse(); });
  },
  on_finish: function(data) {
    trialTotalCount++;
    const userAns = response.slice();
    const correctAns = fds_correct_ans;
    const correct = (userAns.length === correctAns.length && userAns.every((v,i) => v === correctAns[i]));

    spanTrialCount++;
    if(correct) {
      spanCorrectCount++;
      if (currentSpan > maxSpanPassed) maxSpanPassed = currentSpan;
    }

    // Check after 2 trials at this span length
    if(spanTrialCount === 2) {
      if(spanCorrectCount === 0) {
        // Both trials wrong, end experiment
        jsPsych.endExperiment(`Two consecutive incorrect trials at span ${currentSpan}. Your final digit span score is ${maxSpanPassed}.`);
      }
      else {
        // Passed span, increase length
        currentSpan++;
        if(currentSpan > maxSpan) {
          jsPsych.endExperiment(`Maximum span ${maxSpan} reached. Your final digit span score is ${maxSpanPassed}.`);
        }
      }
      spanTrialCount = 0;
      spanCorrectCount = 0;
    }
    response = [];
  }
};

var timeline = [
  preload_digits,
  fds_welcome,
  setup_fds,
  digit_loop,
  fds_response_screen
];

jsPsych.init({ timeline: timeline });
