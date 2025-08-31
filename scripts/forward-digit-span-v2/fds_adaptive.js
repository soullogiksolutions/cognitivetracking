/***************
* Forward Digit Span Task (Modified)
* Original by Stephen Van Hedger, April 2020
* Modified for:
*  - Progress display and early exit after 3 wrong
*  - User chooses audio/visual & number of trials at start
*  - Mobile-friendly Submit button (no enter key)
***************/

// --- Global Variables ---
var useAudio = true;        // Will be set by user choice at start
var currentDigitList;       // Current digit sequence for trial
var totalCorrect = 0;       // Unused but could track total correct if desired
var totalTrials = 0;        // Unused but could track total trials if desired
var maxSpan = 0;            // Highest span reached correctly
var folder = "digits/";     // Audio file folder
var fdsTrialNum = 1;        // Trial counter
var fdsTotalTrials = 12;    // Total trials - user selectable
var response = [];          // Participant responses for trial
var fds_correct_ans;        // Correct answer for current trial
var staircaseChecker = [];  // For assessing performance in staircase
var staircaseIndex = 0;     // Index in staircaseChecker
var digit_list = [1,2,3,4,5,6,7,8,9]; 
var startingSpan = 3;       
var currentSpan;            // Current digit span length
var spanHistory = [];       // History of spans tested
var stimList;               // Stimuli for current trial
var idx = 0;                // Index for stimulus presentation
var exitLetters;            // Flag for end of stimuli presentation
var wrongCount = 0;         // New: Number of wrong answers made

// --- Utils ---
const arrSum = arr => arr.reduce((a,b) => a + b, 0);

// --- Audio files ---
var aud_digits = ['digits/one.wav', 'digits/two.wav', 'digits/three.wav', 'digits/four.wav', 'digits/five.wav', 'digits/six.wav', 'digits/seven.wav', 'digits/eight.wav', 'digits/nine.wav'];

// Add modality to jsPsych data
jsPsych.data.addProperties({
  BDS_modality: useAudio ? 'auditory' : 'visual'
});

// Audio filename map
var fileMap = {
  1: "one.wav", 2: "two.wav", 3: "three.wav", 4:"four.wav", 5:"five.wav",
  6: "six.wav", 7: "seven.wav", 8: "eight.wav", 9: "nine.wav"
};

// Record participant button clicks
var recordClick = function(elm) {
  response.push(Number($(elm).text()));
  document.getElementById("echoed_txt").innerHTML = response.join(' ');
};

// Clear response array and UI
var clearResponse = function() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
};

// Map digit to audio file path
var digitToFile = function(digit) {
  return folder + fileMap[digit];
};

// Fisher-Yates shuffle
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

// Generate random digit list of length len
function getDigitList(len) {
  var shuff_final = [];
  if(len <= digit_list.length) {
    shuff_final = shuffle([...digit_list]);
  } else {
    for(var j=0; j<len; j++){
      var interim_digits = shuffle([...digit_list]);
      shuff_final = [...shuff_final, ...interim_digits];
    }
  }
  return shuff_final.slice(0,len);
}

// Get stimuli list for current trial (audio or visual)
function getStimuli(numDigits) {
  var digit;
  var stimList = [];
  currentDigitList = getDigitList(numDigits);
  for(var i=0; i<currentDigitList.length; i++){
    if(useAudio){
      digit = currentDigitList[i];
      stimList.push(digitToFile(digit));
    } else {
      digit = currentDigitList[i].toString();
      stimList.push('<p style="font-size:60px;font-weight:600;text-align:center;">' + digit + '</p>');
    }
  }
  fds_correct_ans = currentDigitList;
  return stimList;
}

// Update span based on staircase (unused — replaced by wrongCount logic)
function updateSpan() {
  if(arrSum(staircaseChecker) == 1) {
    currentSpan += 1;
    staircaseChecker = [];
    staircaseIndex = 0;
  } else if (arrSum(staircaseChecker) == 0){
    if(staircaseChecker.length == 2) {
      currentSpan -= 1;
      if(currentSpan == 0) currentSpan = 1;
      staircaseChecker = [];
      staircaseIndex = 0;
    }
  }
}

// --- UI components ---

// Response button grid replaced to remove "Press Enter" and instead use "Submit"
var response_grid = 
  '<div class="numbox" style="text-align:center;">' +
  '<p>What were the numbers <b>in order</b>?</p>' +
  [...Array(9)].map((_,i) => 
     `<button id="button_${i+1}" class="square num-button" onclick="recordClick(this)" style="font-size: 24px; padding: 15px; margin: 5px;">${i+1}</button>`).join('') +
  '<br><button class="clear_button" id="ClearButton" onclick="clearResponse()" style="font-size:20px; margin-top:15px;">Clear</button>' +
  '<p><u><b>Current Answer:</b></u></p><div id="echoed_txt" style="font-size:30px; color:blue; min-height: 40px;"></div></div>';

// Instructions dynamically based on modality
var instructions;
var fds_welcome = {
  type: "html-button-response",
  stimulus: function() {
    // Audio or visual selector UI embedded in welcome
    return `
      <h2>Welcome to the Forward Digit Span Task</h2>
      <p>Select presentation mode and number of trials below.</p>
      <div style="margin-bottom: 20px;">
        <button id="btn_audio" style="font-size:22px; padding: 10px 20px; margin-right: 10px;">Audio</button>
        <button id="btn_visual" style="font-size:22px; padding: 10px 20px;">Visual</button>
      </div>
      <div style="margin-bottom:20px;">
        <label for="num_trials" style="font-size:18px;">Number of trials: </label>
        <input type="number" id="num_trials" name="num_trials" value="${fdsTotalTrials}" min="3" max="50" style="font-size:18px; width:60px;">
      </div>
      <p>Then press Continue to start.</p>
    `;
  },
  choices: ['Continue'],
  on_load: function() {
    // Set default selection style
    document.getElementById('btn_audio').style.backgroundColor = '#4CAF50'; // green selected
    document.getElementById('btn_visual').style.backgroundColor = '';

    // Handlers to toggle selection and set useAudio
    document.getElementById('btn_audio').onclick = function() {
      useAudio = true;
      document.getElementById('btn_audio').style.backgroundColor = '#4CAF50';
      document.getElementById('btn_visual').style.backgroundColor = '';
    };
    document.getElementById('btn_visual').onclick = function() {
      useAudio = false;
      document.getElementById('btn_visual').style.backgroundColor = '#4CAF50';
      document.getElementById('btn_audio').style.backgroundColor = '';
    };
  },
  on_finish: function(data) {
    // Update fdsTotalTrials according to user input
    var nt = parseInt(document.getElementById('num_trials').value);
    if(!isNaN(nt) && nt >= 3 && nt <= 50) {
      fdsTotalTrials = nt;
    }
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    wrongCount = 0;
    maxSpan = 0;

    // Dynamically add modality to dataset properties
    jsPsych.data.addProperties({BDS_modality: useAudio ? "auditory" : "visual"});
  }
}

// Setup trial screen showing progress
var setup_fds = {
  type: 'html-button-response',
  stimulus: function(){
    return `<p>Trial ${fdsTrialNum} of ${fdsTotalTrials}</p>
            <p>Current Span: <b>${currentSpan}</b> | Max Span: <b>${maxSpan}</b> | Wrong Attempts: <b>${wrongCount}/3</b></p>`;
  },
  choices: ['Begin'],
  post_trial_gap: 500,
  on_finish: function() {
    stimList = getStimuli(currentSpan);
    spanHistory[fdsTrialNum - 1] = currentSpan;
    idx = 0;
    exitLetters = 0;
  }
};

// Auditory letter presentation
var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    exitLetters = (idx === stimList.length);
  }
};

// Visual letter presentation
var letter_fds_vis = {
  type: 'html-keyboard-response',
  stimulus: function() { return stimList[idx]; },
  choices: jsPsych.NO_KEYS,
  trial_duration: 500,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    exitLetters = (idx === stimList.length);
  }
};

// Conditional loop for letters
var letter_proc;
if(useAudio) {
  letter_proc = {
    timeline: [letter_fds],
    loop_function: function() {
      return !exitLetters;
    }
  };
} else {
  letter_proc = {
    timeline: [letter_fds_vis],
    loop_function: function() {
      return !exitLetters;
    }
  };
}

// Response screen with Submit button (mobile friendly)
var fds_response_screen = {
  type: 'html-button-response',
  stimulus: response_grid,
  choices: ['Submit Answer'],
  on_finish: function() {
    var curans = response;
    var corans = fds_correct_ans;
    var gotItRight = 0;
    if(JSON.stringify(curans) === JSON.stringify(corans)) {
      gotItRight = 1;
      if(currentSpan > maxSpan) maxSpan = currentSpan;
      // Increase span for next trial
      currentSpan++;
    } else {
      // Count wrong answer
      wrongCount++;
      // Decrease span if possible (minimum 1)
      if(wrongCount < 3 && currentSpan > 1) currentSpan--;
    }
    response = [];
    fdsTrialNum++;
    staircaseChecker[staircaseIndex] = gotItRight;
    staircaseIndex++;

    // Optional: log performance - disable if unwanted
    jsPsych.data.addDataToLastTrial({
      designation: 'FDS-RESPONSE',
      span: currentSpan,
      answer: curans,
      correct: corans,
      was_correct: gotItRight,
      spanHistory: spanHistory
    });
  }
};

// Staircase assessment (optional)
var staircase_assess = {
  type: 'call-function',
  func: updateSpan
};

// Core trial procedure combining setup, stimuli, response, staircase
var staircase = {
  timeline: [setup_fds, letter_proc, fds_response_screen, staircase_assess]
};

// Main experiment procedure with loop exit after trial count or 3 wrong answers
var fds_mainproc = {
  timeline: [staircase],
  loop_function: function() {
    return (fdsTrialNum <= fdsTotalTrials && wrongCount < 3);
  }
};

// Wrap-up screen showing final score
var fds_wrapup = {
  type: 'html-button-response',
  stimulus: function() {
    return `<p>Thank you for participating. This concludes the forward digit span task.</p>
            <p><b>Your final digit span score:</b> ${maxSpan}</p>`;
  },
  choices: ['Exit']
};

// Main adaptive timeline to push into your experiment
var fds_adaptive = {
  timeline: [/* preload_digits (optional, if auditory) */ fds_welcome, fds_mainproc, fds_wrapup]
};
