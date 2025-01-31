// Google Apps Script のウェブアプリURLを指定
const GAS_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbzCtu3zi5kz5zqujQriwkEfvyPPr4ABhEADSYo8Q6SWBJhrO6NAMRoob-b_2Hfrt_LBUg/exec";

// グローバル変数
let setsData = {};
let currentSet = null;
let currentQuestionIndex = 0;
let answers = [];

// 要素取得
const userInfoSection = document.getElementById("user-info-section");
const surveySection = document.getElementById("survey-section");
const sendingSection = document.getElementById("sending-section");
const resultSection = document.getElementById("result-section");

const userNameInput = document.getElementById("userName");
const setNumberSelect = document.getElementById("setNumber");
const startSurveyButton = document.getElementById("startSurveyButton");

const currentQuestionNumberSpan = document.getElementById("current-question-number");
const totalQuestionNumberSpan = document.getElementById("total-question-number");

const refAudioSource = document.getElementById("ref-audio-source");
const method1AudioSource = document.getElementById("method1-audio-source");
const method2AudioSource = document.getElementById("method2-audio-source");
const refAudio = document.getElementById("ref-audio");
const method1Audio = document.getElementById("method1-audio");
const method2Audio = document.getElementById("method2-audio");

const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");

const sendingErrorMessage = document.getElementById("sending-error-message");
const retryButton = document.getElementById("retryButton");

// ページ読み込み時
window.addEventListener("load", async () => {
  try {
    const response = await fetch("config/sets.json");
    setsData = await response.json();
    console.log("sets.json loaded:", setsData);
  } catch (error) {
    console.error("sets.json load error:", error);
    alert("設定ファイル(sets.json)の読み込みに失敗しました。");
  }

  startSurveyButton.addEventListener("click", onStartSurvey);
  prevButton.addEventListener("click", onPrevQuestion);
  nextButton.addEventListener("click", onNextQuestion);
  retryButton.addEventListener("click", onRetrySubmit);
});

// アンケート開始ボタン
function onStartSurvey() {
  const userName = userNameInput.value.trim();
  const setNumber = setNumberSelect.value;

  if (!userName) {
    alert("名前を入力してください。");
    return;
  }
  if (!setNumber) {
    alert("セット番号を選択してください。");
    return;
  }

  if (!setsData[setNumber]) {
    alert("選択したセットが見つかりません。");
    return;
  }
  currentSet = setsData[setNumber];

  // answers配列をセットの問題数に合わせて初期化
  answers = currentSet.questions.map(q => {
    return {
      questionIndex: q.questionIndex,
      naturalness: null,
      reproduction: null,
    };
  });

  userInfoSection.style.display = "none";
  surveySection.style.display = "block";
  sendingSection.style.display = "none";
  resultSection.style.display = "none";

  currentQuestionIndex = 0;
  updateSurveyUI();
}

// アンケート画面を更新
function updateSurveyUI() {
  const total = currentSet.questions.length;
  currentQuestionNumberSpan.textContent = (currentQuestionIndex + 1).toString();
  totalQuestionNumberSpan.textContent = total.toString();

  const qData = currentSet.questions[currentQuestionIndex];
  refAudioSource.src = qData.refAudio;
  method1AudioSource.src = qData.method1Audio;
  method2AudioSource.src = qData.method2Audio;

  refAudio.load();
  method1Audio.load();
  method2Audio.load();

  // 既存回答をラジオボタンに反映
  setRadioValue("naturalness", answers[currentQuestionIndex].naturalness);
  setRadioValue("reproduction", answers[currentQuestionIndex].reproduction);

  // 最初の問題なら「前へ」無効
  prevButton.disabled = (currentQuestionIndex === 0);
}

// ラジオボタンの値をセット
function setRadioValue(groupName, value) {
  const radios = document.querySelectorAll(`input[name="${groupName}"]`);
  radios.forEach(r => {
    r.checked = (r.value === value);
  });
}

// 前へボタン
function onPrevQuestion() {
  saveCurrentAnswers();
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    updateSurveyUI();
  }
}

// 次へボタン
function onNextQuestion() {
  saveCurrentAnswers();
  const ans = answers[currentQuestionIndex];
  if (!ans.naturalness || !ans.reproduction) {
    alert("未回答の項目があります。");
    return;
  }

  const total = currentSet.questions.length;
  if (currentQuestionIndex < total - 1) {
    currentQuestionIndex++;
    updateSurveyUI();
  } else {
    // 最終問題の次は送信画面
    goToSending();
  }
}

// 現在の設問回答を保存
function saveCurrentAnswers() {
  answers[currentQuestionIndex].naturalness = getRadioValue("naturalness");
  answers[currentQuestionIndex].reproduction = getRadioValue("reproduction");
}

// ラジオボタンの選択取得
function getRadioValue(groupName) {
  const radios = document.querySelectorAll(`input[name="${groupName}"]`);
  for (const r of radios) {
    if (r.checked) {
      return r.value;
    }
  }
  return null;
}

// 送信画面へ遷移
function goToSending() {
  surveySection.style.display = "none";
  sendingSection.style.display = "block";
  resultSection.style.display = "none";

  submitAnswers();
}

// 回答送信 (FormDataで送信)
async function submitAnswers() {
  const userName = userNameInput.value.trim();
  const setNumber = setNumberSelect.value;

  const postData = {
    name: userName,
    setNumber: setNumber,
    answers: answers
  };

  sendingErrorMessage.style.display = "none";
  retryButton.style.display = "none";

  try {
    // FormData で送信 (Content-Typeを指定しない)
    const formData = new FormData();
    // "json" というキーで送る
    formData.append("json", JSON.stringify(postData));

    const response = await fetch(GAS_ENDPOINT_URL, {
      method: "POST",
      body: formData // multipart/form-dataになる
    });

    if (!response.ok) {
      throw new Error("Response not ok");
    }

    const respText = await response.text();
    console.log("Response from GAS:", respText);

    // 送信完了画面へ
    sendingSection.style.display = "none";
    resultSection.style.display = "block";

  } catch (error) {
    console.error("Submit error:", error);
    sendingErrorMessage.style.display = "block";
    retryButton.style.display = "inline-block";
  }
}

// 再送信ボタン
function onRetrySubmit() {
  submitAnswers();
}
