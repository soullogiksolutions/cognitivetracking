// Globals
var useAudio = true;
var fdsTotalTrials = 12;
var fdsTrialNum = 1;
var startingSpan = 3;
var currentSpan = startingSpan;
var maxSpan = 0;
var wrongCount = 0;
var spanHistory = [];
var response = [];
var currentDigitList;
var fds_correct_ans;
var stimList;
var idx = 0;
var exitLetters = false;
var folder = "digits/"; // Folder at same level as script

// Map digits to word-based filenames
var fileMap = {
  1: "one.wav", 2: "two.wav", 3: "three.wav", 4: "four.wav",
  5: "five.wav", 6: "six.wav", 7: "seven.wav", 8: "eight.wav", 9: "nine.wav"
};

function digitToFile(digit) {
  return folder + fileMap[digit];
}

var digit_list = [1,2,3,4,5,6,7,8,9];

// AudioContext variable
var audioContext;

// Helpers
function shuffle(arr) {
  for(let i = arr.length-1; i > 0; i--) {
    let j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDigitList(len) {
  let baseShuffled = [];
  if(len <= digit_list.length) {
    baseShuffled = shuffle([...digit_list]);
  } else {
    while(baseShuffled.length < len) {
      baseShuffled = [...baseShuffled, ...shuffle([...digit_list])];
    }
  }
  return baseShuffled.slice(0,len);
}

function getStimuli(len) {
  stimList = [];
  currentDigitList = getDigitList(len);
  for(let d of currentDigitList) {
    if(useAudio) {
      stimList.push(digitToFile(d));
    } else {
      stimList.push(`<p style="font-size:60px; font-weight:600; text-align:center;">${d}</p>`);
    }
  }
  fds_correct_ans = [...currentDigitList];
  return stimList;
}

function recordClick(elm) {
  response.push(Number(elm.innerText));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
}

function clearResponse() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
}

// Preload audio digits
var aud_digits = digit_list.map(d => digitToFile(d));
var preload_digits = {
  type: 'preload',
  audio: aud_digits,
};

// Welcome screen
var fds_welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Select mode:</p>
    <button id="audioBtn" style="font-size:20px; margin-right:10px;">Audio</button>
    <button id="visualBtn" style="font-size:20px;" disabled style="background-color:lightgray; cursor:not-allowed;" title="Visual mode not yet supported">Visual</button>
    <p>Number of trials (3-50):</p>
    <input type="number" id="numTrials" value="12" min="3" max="50" style="font-size:18px; width:60px;">
    <p>Press Continue to start.</p>`,
  choices: ['Continue'],
  on_load: function() {
    $('#audioBtn').css('background-color', '#4CAF50');
    $('#audioBtn').click(() => {
      useAudio = true;
      $('#audioBtn').css('background-color', '#4CAF50');
      $('#visualBtn').css('background-color', '');
    });
  },
  on_finish: function() {
    if (useAudio) {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed');
        });
      }
    }
    let nt = parseInt($('#numTrials').val());
    fdsTotalTrials = (nt >= 3 && nt <= 50) ? nt : 12;
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    wrongCount = 0;
    maxSpan = 0;
    spanHistory = [];
    jsPsych.data.addProperties({BDS_modality: useAudio ? 'auditory' : 'visual'});
  }
};

// Setup trial screen
var setup_fds = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Trial ${fdsTrialNum} of ${fdsTotalTrials}</p>
            <p>Current Span: <b>${currentSpan}</b> | Max Span: <b>${maxSpan}</b> | Wrong Attempts: <b>${wrongCount}/3</b></p>`;
  },
  choices: ['Begin'],
  post_trial_gap: 500,
  on_finish: function() {
    getStimuli(currentSpan);
    idx = 0;
    exitLetters = false;
    spanHistory[fdsTrialNum - 1] = currentSpan;
  }
};

// Audio digit presentation
var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    if(idx >= stimList.length) exitLetters = true;
  }
};

// Response screen
var response_grid = `
<div style="text-align:center;">
  <p>What were the numbers <b>in order</b>?</p>
  ${Array.from({length:9}, (_,i) => `<button class="num-button">${i+1}</button>`).join('')}
  <br><br>
  <button class="clear-button" id="clearBtn">Clear</button>
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
  on_finish: function() {
    let curans = response.slice();
    let corans = fds_correct_ans;
    let correct = (JSON.stringify(curans) === JSON.stringify(corans));

    if(correct) {
      if(currentSpan > maxSpan) maxSpan = currentSpan;
      currentSpan++;
      wrongCount = 0; // reset wrong counter on correct
    } else {
      wrongCount++;
    }

    response = [];
    fdsTrialNum++;

    jsPsych.data.addDataToLastTrial({
      designation: 'FDS-RESPONSE',
      span: currentSpan,
      answer: curans,
      correct: corans,
      was_correct: correct,
      spanHistory: spanHistory
    });
  }
};

// Wrap-up screen
var fds_wrapup = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Thank you for participating. This concludes the forward digit span task.</p>
            <p><b>Your final digit span score:</b> ${maxSpan}</p>`;
  },
  choices: ['Exit']
};

// Trial timeline block with loop function controlling stop conditions
var fds_trial_block = {
  timeline: [setup_fds, letter_fds, fds_response_screen],
  loop_function: function() {
    // Exit loop only if total trials exceeded or 3 wrong answers reached
    if(fdsTrialNum > fdsTotalTrials || wrongCount >= 3) {
      return false; // Stop looping
    }
    return true; // Continue looping
  }
};

// Build experiment timeline
var timeline = [];
timeline.push(preload_digits);
timeline.push(fds_welcome);
timeline.push(fds_trial_block);
timeline.push(fds_wrapup);

// Initialize jsPsych with timeline
jsPsych.init({ timeline: timeline });
