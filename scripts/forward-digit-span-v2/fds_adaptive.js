/*** Adaptive Forward Digit Span Task ***/

// Globals and variables
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
var folder = "digits/";
var digit_list = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Fisher-Yates shuffle
function shuffle(arr) {
  var j, temp, i;
  for (i=arr.length-1; i>0; i--) {
    j = Math.floor(Math.random()*(i+1));
    temp=arr[i];
    arr[i]=arr[j];
    arr[j]=temp;
  }
  return arr;
}

// Generate digit list for current span
function getDigitList(len) {
  var baseShuffled = [];
  if (len <= digit_list.length) {
    baseShuffled = shuffle([...digit_list]);
  } else {
    while (baseShuffled.length < len) {
      baseShuffled = [...baseShuffled, ...shuffle([...digit_list])];
    }
  }
  return baseShuffled.slice(0, len);
}

// Create stimuli for trial
function getStimuli(len) {
  stimList = [];
  currentDigitList = getDigitList(len);
  for (let i=0;i<currentDigitList.length;i++) {
    if (useAudio) {
      stimList.push(folder + currentDigitList[i] + ".wav");
    } else {
      stimList.push(`<p style="font-size:60px; font-weight:600; text-align:center;">${currentDigitList[i]}</p>`);
    }
  }
  fds_correct_ans = [...currentDigitList];
  return stimList;
}

// Record button clicks
function recordClick(elm) {
  response.push(Number(elm.innerText));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
}

// Clear response input
function clearResponse() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
}

// Preload digit audio files
var aud_digits = digit_list.map(d => folder + d + ".wav");
var preload_digits = {
  type: 'preload',
  audio: aud_digits,
};

// Welcome screen
var fds_welcome = {
  type: 'html-button-response',
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Select presentation mode:</p>
    <button id="audioBtn" style="font-size:20px; margin-right: 10px;">Audio</button>
    <button id="visualBtn" style="font-size:20px;">Visual</button>
    <p>Choose number of trials (3-50):</p>
    <input type="number" id="numTrials" value="12" min="3" max="50" style="width:60px; font-size:18px;">
    <p>Press Continue when ready.</p>`,
  choices: ['Continue'],
  on_load: function() {
    $('#audioBtn').css('background-color', '#4CAF50');
    $('#visualBtn').css('background-color', '');
    $('#audioBtn').click(() => {
      useAudio = true;
      $('#audioBtn').css('background-color', '#4CAF50');
      $('#visualBtn').css('background-color', '');
    });
    $('#visualBtn').click(() => {
      useAudio = false;
      $('#visualBtn').css('background-color', '#4CAF50');
      $('#audioBtn').css('background-color', '');
    });
  },
  on_start: function() {
    // Save number of trials safely from DOM to trial data
    this.data.numTrials = $('#numTrials').val();
  },
  on_finish: function(data) {
    let nt = parseInt(data.numTrials);
    if (!isNaN(nt) && nt >= 3 && nt <= 50) {
      fdsTotalTrials = nt;
    } else {
      fdsTotalTrials = 12; // default fallback
    }
    // Reset for trial start
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    wrongCount = 0;
    maxSpan = 0;
    spanHistory = [];
    jsPsych.data.addProperties({"BDS_modality": useAudio ? "auditory" : "visual"});
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

// Audio stimuli presentation trial
var letter_fds = {
  type: 'audio-keyboard-response',
  stimulus: function() {
    return stimList[idx];
  },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    if (idx >= stimList.length) exitLetters = true;
  }
};

// Visual stimuli presentation trial
var letter_fds_vis = {
  type: 'html-keyboard-response',
  stimulus: function() {
    return stimList[idx];
  },
  choices: jsPsych.NO_KEYS,
  trial_duration: 700,
  post_trial_gap: 250,
  on_finish: function() {
    idx++;
    if (idx >= stimList.length) exitLetters = true;
  }
};

// Loop presentations for audio and visual
var letter_proc_audio = {
  timeline: [letter_fds],
  loop_function: function() {
    return !exitLetters;
  }
};
var letter_proc_visual = {
  timeline: [letter_fds_vis],
  loop_function: function() {
    return !exitLetters;
  }
};

// Response buttons HTML
var response_grid = `
  <div style="text-align:center;">
    <p>What were the numbers <b>in order</b>?</p>
    ${Array.from({length: 9}, (_, i) => `<button class="num-button">${i+1}</button>`).join('')}
    <br>
    <button class="clear-button" id="clearBtn">Clear</button>
    <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
  </div>
`;

// Response screen trial
var fds_response_screen = {
  type: 'html-button-response',
  stimulus: response_grid,
  choices: ['Submit Answer'],
  on_load: function() {
    $('.num-button').click(function() {
      recordClick(this);
    });
    $('#clearBtn').click(function() {
      clearResponse();
    });
  },
  on_finish: function() {
    var curans = response.slice();
    var corans = fds_correct_ans;
    var correct = (JSON.stringify(curans) === JSON.stringify(corans));
    if (correct) {
      if (currentSpan > maxSpan) maxSpan = currentSpan;
      currentSpan++;
    } else {
      wrongCount++;
      if (wrongCount < 3 && currentSpan > 1) currentSpan--;
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

// Build timeline conditionally
var timeline = [];

timeline.push(preload_digits);
timeline.push(fds_welcome);
timeline.push(setup_fds);

if (useAudio) {
  timeline.push(letter_proc_audio);
} else {
  timeline.push(letter_proc_visual);
}

timeline.push(fds_response_screen);
timeline.push(fds_wrapup);

// Initialize jsPsych
jsPsych.init({
  timeline: timeline
});
