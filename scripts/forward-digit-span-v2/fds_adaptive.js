/*** Forward Digit Span Adaptive Task with Detailed Logging ***/

// Global variables
var useAudio = true;
var currentDigitList;
var maxSpan = 0;
var folder = "digits/";
var fdsTrialNum = 1;
var fdsTotalTrials = 12;
var response = [];
var fds_correct_ans;
var digit_list = [1,2,3,4,5,6,7,8,9];
var startingSpan = 3;
var currentSpan;
var stimList;
var idx = 0;
var exitLetters = false;
var wrongCount = 0;
var spanHistory = [];

console.clear(); // Clear previous log

function logStep(msg) {
  console.log("%c[DigitSpan] " + msg, "color: blue; font-weight: bold");
}

function shuffle(arr) {
  var j, temp, i;
  for (i = arr.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function getDigitList(len) {
  logStep(`Generating digit list of length ${len}`);
  var baseShuffled = [];
  if (len <= digit_list.length) {
    baseShuffled = shuffle([...digit_list]);
  } else {
    while (baseShuffled.length < len) {
      baseShuffled = [...baseShuffled, ...shuffle([...digit_list])];
    }
  }
  logStep(`Generated digit list: ${baseShuffled.slice(0, len).join(", ")}`);
  return baseShuffled.slice(0, len);
}

function getStimuli(len) {
  logStep(`Creating stimuli for digit length: ${len}`);
  stimList = [];
  currentDigitList = getDigitList(len);
  for (let i = 0; i < currentDigitList.length; i++) {
    if (useAudio) {
      stimList.push(folder + currentDigitList[i] + ".wav");
    } else {
      stimList.push(
        `<p style="font-size:60px; font-weight:600; text-align:center;">${currentDigitList[i]}</p>`
      );
    }
  }
  fds_correct_ans = [...currentDigitList];
  logStep(
    `Stimuli prepared: ${useAudio ? "Audio files" : "Visual digits"} for digits: ${
      fds_correct_ans.join(", ")
    }`
  );
  return stimList;
}

function recordClick(elm) {
  response.push(Number(elm.innerText));
  document.getElementById("echoed_txt").innerHTML = response.join(" ");
  logStep(`User clicked: ${elm.innerText} | Current response: ${response.join(", ")}`);
}

function clearResponse() {
  response = [];
  document.getElementById("echoed_txt").innerHTML = "";
  logStep("User cleared the response input");
}

var fds_welcome = {
  type: "html-button-response",
  stimulus: `
    <h2>Forward Digit Span Task</h2>
    <p>Select presentation mode:</p>
    <button id="audioBtn" style="font-size:20px; margin-right:10px;">Audio</button>
    <button id="visualBtn" style="font-size:20px;">Visual</button>
    <p>Number of trials (3-50):</p>
    <input type="number" id="numTrials" value="12" min="3" max="50" style="width:60px; font-size:18px;">
    <p>Press Continue when ready.</p>
  `,
  choices: ["Continue"],
  on_load: function () {
    logStep("Welcome screen loaded");
    $("#audioBtn").css("background-color", "#4CAF50");
    $("#visualBtn").css("background-color", "");
    $("#audioBtn").click(function () {
      useAudio = true;
      $("#audioBtn").css("background-color", "#4CAF50");
      $("#visualBtn").css("background-color", "");
      logStep("User selected: Audio mode");
    });
    $("#visualBtn").click(function () {
      useAudio = false;
      $("#visualBtn").css("background-color", "#4CAF50");
      $("#audioBtn").css("background-color", "");
      logStep("User selected: Visual mode");
    });
  },
  on_start: function () {
    // Access while input exists
    if (document.getElementById("numTrials")) {
      this.data.numTrials = document.getElementById("numTrials").value;
      logStep(`User entered number of trials: ${this.data.numTrials}`);
    } else {
      logStep("Warning: number of trials input not found!");
    }
  },
  on_finish: function (data) {
    let nt = parseInt(data.numTrials);
    if (!isNaN(nt) && nt >= 3 && nt <= 50) {
      fdsTotalTrials = nt;
      logStep(`Total number of trials set: ${fdsTotalTrials}`);
    } else {
      logStep(
        "Invalid number of trials input detected, defaulting to 12"
      );
      fdsTotalTrials = 12;
    }
    currentSpan = startingSpan;
    fdsTrialNum = 1;
    wrongCount = 0;
    maxSpan = 0;
    spanHistory = [];
    jsPsych.data.addProperties({
      BDS_modality: useAudio ? "auditory" : "visual",
    });
  },
};

var setup_fds = {
  type: "html-button-response",
  stimulus: function () {
    return `<p>Trial ${fdsTrialNum} of ${fdsTotalTrials}</p>
            <p>Current Span: <b>${currentSpan}</b> | Max Span: <b>${maxSpan}</b> | Wrong Attempts: <b>${wrongCount}/3</b></p>`;
  },
  choices: ["Begin"],
  post_trial_gap: 500,
  on_finish: function () {
    logStep(`Setting up trial ${fdsTrialNum} with current span ${currentSpan}`);
    getStimuli(currentSpan);
    idx = 0;
    exitLetters = false;
    spanHistory[fdsTrialNum - 1] = currentSpan;
  },
};

var letter_fds = {
  type: "audio-keyboard-response",
  stimulus: function () {
    return stimList[idx];
  },
  choices: jsPsych.NO_KEYS,
  trial_ends_after_audio: true,
  post_trial_gap: 250,
  on_finish: function () {
    idx++;
    if (idx >= stimList.length) {
      exitLetters = true;
      logStep("Audio stimuli completed");
    }
  },
};

var letter_fds_vis = {
  type: "html-keyboard-response",
  stimulus: function () {
    return stimList[idx];
  },
  choices: jsPsych.NO_KEYS,
  trial_duration: 700,
  post_trial_gap: 250,
  on_finish: function () {
    idx++;
    if (idx >= stimList.length) {
      exitLetters = true;
      logStep("Visual stimuli completed");
    }
  },
};

var letter_proc_audio = {
  timeline: [letter_fds],
  loop_function: function () {
    return !exitLetters;
  },
};

var letter_proc_visual = {
  timeline: [letter_fds_vis],
  loop_function: function () {
    return !exitLetters;
  },
};

var response_grid = `
  <div style="text-align:center;">
    <p>What were the numbers <b>in order</b>?</p>
    ${Array.from({ length: 9 }, (_, i) => `<button class="num-button">${i + 1}</button>`).join("")}
    <br>
    <button class="clear-button" id="clearBtn">Clear</button>
    <div><b>Current Answer:</b> <span id="echoed_txt"></span></div>
  </div>
`;

var fds_response_screen = {
  type: "html-button-response",
  stimulus: response_grid,
  choices: ["Submit Answer"],
  on_load: function () {
    $(".num-button").click(function () {
      recordClick(this);
    });
    $("#clearBtn").click(function () {
      clearResponse();
    });
    logStep("Response screen loaded, buttons activated");
  },
  on_finish: function () {
    var curans = response.slice();
    var corans = fds_correct_ans;
    var correct = JSON.stringify(curans) === JSON.stringify(corans);
    logStep(
      `Response submitted: ${curans.join(", ")} | Correct answer: ${corans.join(", ")} | Correct?: ${correct}`
    );
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
      designation: "FDS-RESPONSE",
      span: currentSpan,
      answer: curans,
      correct: corans,
      was_correct: correct,
      spanHistory: spanHistory,
    });
    logStep(
      `Trial ${fdsTrialNum - 1} ended. Next trial number: ${fdsTrialNum}, Current span: ${currentSpan}, Wrong count: ${wrongCount}`
    );
  },
};

var fds_wrapup = {
  type: "html-button-response",
  stimulus: function () {
    return `<p>Thank you for participating. This concludes the forward digit span task.</p>
            <p><b>Your final digit span score:</b> ${maxSpan}</p>`;
  },
  choices: ["Exit"],
  on_load: function(){
    logStep("Wrap-up screen displayed");
  }
};

// Build timeline dynamically based on modality
var timeline = [];

timeline.push(fds_welcome);
timeline.push(setup_fds);

if (useAudio) {
  timeline.push(letter_proc_audio);
} else {
  timeline.push(letter_proc_visual);
}

timeline.push(fds_response_screen);
timeline.push(fds_wrapup);

logStep("Experiment initialization complete. Starting jsPsych");

jsPsych.init({
  timeline: timeline,
  on_finish: function(){
    logStep("Experiment finished.");
    console.log("Final data:", jsPsych.data.get().csv());
  }
});
