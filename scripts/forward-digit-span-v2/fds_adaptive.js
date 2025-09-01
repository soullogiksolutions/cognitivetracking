// Globals
var useAudio = true;
var fdsTotalTrials = 12;
var fdsTrialNum = 1;
var startingSpan = 3;
var currentSpan = startingSpan;   // will be updated after each correct answer
var maxSpan = startingSpan;
var totalWrongCount = 0;
var response = [];
var fds_correct_ans = [];
var stimList = [];
var idx = 0;
var exitDigits = false;
var folder = "digits/";
var spanHistory = [];
var fileMap = {
  1: "one.wav", 2: "two.wav", 3: "three.wav", 4: "four.wav",
  5: "five.wav", 6: "six.wav", 7: "seven.wav", 8: "eight.wav", 9: "nine.wav"
};

function digitToFile(digit) {
  return folder + fileMap[digit];
}
var digit_list = [1,2,3,4,5,6,7,8,9];

function shuffle(arr) {
  for(let i=arr.length-1;i>0;i--) {
    let j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDigitList(len) {
  let result = [];
  while(result.length < len) {
    result.push(...shuffle([...digit_list]));
  }
  return result.slice(0, len);
}

function getStimuli(len) {
  let digits = getDigitList(len);
  stimList = digits.map(d => digitToFile(d));
  fds_correct_ans = digits; // save correct answer as an array of numbers
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

var audioContext;
var preload_digits = {
  type: 'preload',
  audio: aud_digits,
};

var fds_welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Mode: <b>Audio (required)</b></p>
    <button id="audioBtn" style="font-size:20px; margin-right:10px; background-color: #4CAF50;">Audio</button>
    <button id="visualBtn" style="font-size:20px; background-color:lightgray;" disabled title="Visual mode not supported">Visual (disabled)</button>
    <p>Number of trials (3-50):</p>
    <input type="number" id="numTrials" value="12" min="3" max="50" style="font-size:18px; width:60px;">
    <p>Press Continue to start.</p>`,
  choices: ['Continue'],
  on_finish: function() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed');
      });
    }
    let nt = parseInt($('#numTrials').val());
    fdsTotalTrials = (nt >= 3 && nt <= 50) ? nt : 12;
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    totalWrongCount = 0;
    maxSpan = startingSpan;
    spanHistory = [];
    jsPsych.data.addProperties({BDS_modality: 'auditory'});
  }
};

// Setup trial
var setup_fds = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Trial ${fdsTrialNum} of ${fdsTotalTrials}</p>
            <p>Current Span: <b>${currentSpan}</b> | Max Span: <b>${maxSpan}</b> | Errors: <b>${totalWrongCount}/3</b></p>`;
  },
  choices: ['Begin'],
  post_trial_gap: 500,
  on_finish: function() {
    getStimuli(currentSpan); // Stimuli and correct ans for this trial
    idx = 0;
    exitDigits = false;
    spanHistory[fdsTrialNum-1] = currentSpan;
  }
};

// Audio presentation of digits (one at a time, looping)
var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 200,
  on_finish: function() {
    idx++;
    if(idx >= stimList.length) exitDigits = true;
  }
};
var digit_loop = {
  timeline: [letter_fds],
  loop_function: function() { return !exitDigits; }
};
// Response grid
var response_grid = `
<div style="text-align:center;">
  <p>What were the numbers <b>in order</b>?</p>
  ${Array.from({length:9},(_,i)=> `<button class="num-button">${i+1}</button>`).join('')}
  <br><br>
  <button class="clear-button" id="clearBtn">Clear</button>
  <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
</div>
`;
// Response collection
var fds_response_screen = {
  type: 'html-button-response',
  stimulus: response_grid,
  choices: ['Submit Answer'],
  on_load: function() {
    $('.num-button').click(function() { recordClick(this); });
    $('#clearBtn').click(function() { clearResponse(); });
  },
  on_finish: function() {
    let curans = response.slice();
    let corans = fds_correct_ans;
    let correct = (curans.length === corans.length && curans.every((v,i)=>v === corans[i]));
    if(correct) {
      if(currentSpan > maxSpan) maxSpan = currentSpan;
      currentSpan++; // increase span for next trial
    } else {
      totalWrongCount++; // global errors (not per span)
    }
    response = [];
    fdsTrialNum++;
    jsPsych.data.addDataToLastTrial({
      designation: 'FDS-RESPONSE',
      span: currentSpan,
      answer: curans,
      correct: corans,
      was_correct: correct,
      spanHistory,
      totalWrongCount
    });
  }
};

var fds_wrapup = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Thank you for participating. This concludes the forward digit span task.</p>
            <p><b>Your final digit span score:</b> ${maxSpan}</p>`;
  },
  choices: ['Exit']
};

var fds_trial_block = {
  timeline: [setup_fds, digit_loop, fds_response_screen],
  loop_function: function() {
    if (fdsTrialNum > fdsTotalTrials || totalWrongCount >= 3) return false;
    return true;
  }
};

var timeline = [];
timeline.push(preload_digits);
timeline.push(fds_welcome);
timeline.push(fds_trial_block);
timeline.push(fds_wrapup);

jsPsych.init({ timeline: timeline });
