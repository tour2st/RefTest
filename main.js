// Google Apps Script のウェブアプリURLを指定
// 例: "https://script.google.com/macros/s/AKfycbxxxxxx/exec"
const GAS_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxFdPwTNdKYABNLtGHyLqBJJXm2uz5ve86NWe6vPkASIZuZRjtnqhYD6_DqEB4ZUdltQw/exec";

// グローバル変数的に管理
let setsData = {};      // sets.jsonの内容を保持
let currentSet = null;  // 選択されたセットのオブジェクト
let currentQuestionIndex = 0; // 0-basedで管理
let answers = [];       // 回答格納用配列

// ページ要素取得
const userInfoSection = document.getElementById("user-info-section");
const surveySection = document.getElementById("survey-section");
const sendingSection = document.getElementById("sending-section");
const resultSection = document.getElementById("result-section");

const userNameInput = document.getElementById("userName");
const setNumberSelect = document.getElementById("setNumber");
const startSurveyButton = document.getElementById("startSurveyButton");

const questionProgress = document.getElementById("question-progress");
const currentQuestionNumberSpan = document.getElementById("current-question-number");
const totalQuestionNumberSpan = document.getElementById("total-question-number");

const refAudio = document.getElementById("ref-audio");
const refAudioSource = document.getElementById("ref-audio-source");
const method1Audio = document.getElementById("method1-audio");
const method1AudioSource = document.getElementById("method1-audio-source");
const method2Audio = document.getElementById("method2-audio");
const method2AudioSource = document.getElementById("method2-audio-source");

const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");

const sendingErrorMessage = document.getElementById("sending-error-message");
const retryButton = document.getElementById("retryButton");

// ページ読み込み時の処理
window.addEventListener("load", async () => {
  // sets.jsonを読み込んで setsData に格納
  try {
    const response = await fetch("config/sets.json");
    setsData = await response.json();
    console.log("sets.json loaded:", setsData);
  } catch (error) {
    console.error("sets.json load error:", error);
    alert("設定ファイル(sets.json)の読み込みに失敗しました。");
  }

  // イベントリスナー登録
  startSurveyButton.addEventListener("click", onStartSurvey);
  prevButton.addEventListener("click", onPrevQuestion);
  nextButton.addEventListener("click", onNextQuestion);
  retryButton.addEventListener("click", onRetrySubmit);
});

// 「アンケート開始」ボタン押下時
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

  // 選択されたセットの questions を取得
  if (!setsData[setNumber]) {
    alert("選択したセットが見つかりません。");
    return;
  }
  currentSet = setsData[setNumber];
  
  // 回答格納用配列を初期化 (質問数に合わせる)
  answers = currentSet.questions.map(q => {
    return {
      questionIndex: q.questionIndex,
      naturalness: null,
      reproduction: null,
    };
  });

  // 画面遷移
  userInfoSection.style.display = "none";
  surveySection.style.display = "block";
  sendingSection.style.display = "none";
  resultSection.style.display = "none";

  currentQuestionIndex = 0; // 最初の設問へ
  updateSurveyUI();
}

// アンケート画面を更新（音声ソースやラジオボタン状態の反映）
function updateSurveyUI() {
  const totalQuestions = currentSet.questions.length;
  currentQuestionNumberSpan.textContent = (currentQuestionIndex + 1).toString();
  totalQuestionNumberSpan.textContent = totalQuestions.toString();

  const questionData = currentSet.questions[currentQuestionIndex];

  // 音声パスの設定
  refAudioSource.src = questionData.refAudio;
  method1AudioSource.src = questionData.method1Audio;
  method2AudioSource.src = questionData.method2Audio;

  // audio要素に読み込みを指示
  refAudio.load();
  method1Audio.load();
  method2Audio.load();

  // 回答があればラジオボタンに反映
  const answer = answers[currentQuestionIndex];
  setRadioValue("naturalness", answer.naturalness);
  setRadioValue("reproduction", answer.reproduction);

  // 前ボタンは先頭質問なら非活性、そうでなければ活性
  prevButton.disabled = (currentQuestionIndex === 0);
}

// ラジオボタンの値設定
function setRadioValue(groupName, value) {
  const radios = document.querySelectorAll(`input[name="${groupName}"]`);
  radios.forEach(radio => {
    radio.checked = (radio.value === value);
  });
}

// 現在のページのラジオボタン選択を answers に保存
function saveCurrentAnswers() {
  const naturalnessValue = getRadioValue("naturalness");
  const reproductionValue = getRadioValue("reproduction");

  answers[currentQuestionIndex].naturalness = naturalnessValue;
  answers[currentQuestionIndex].reproduction = reproductionValue;
}

// ラジオボタンの選択取得
function getRadioValue(groupName) {
  const radios = document.querySelectorAll(`input[name="${groupName}"]`);
  for (const radio of radios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return null;
}

// 「前へ」ボタン
function onPrevQuestion() {
  // 現在の回答を保存
  saveCurrentAnswers();

  // 1つ前の設問へ
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    updateSurveyUI();
  }
}

// 「次へ」ボタン
function onNextQuestion() {
  // 現在の回答を保存
  saveCurrentAnswers();

  // 未回答チェック
  const answer = answers[currentQuestionIndex];
  if (!answer.naturalness || !answer.reproduction) {
    alert("未回答の項目があります。");
    return;
  }

  const totalQuestions = currentSet.questions.length;
  if (currentQuestionIndex < totalQuestions - 1) {
    // 次の設問へ
    currentQuestionIndex++;
    updateSurveyUI();
  } else {
    // 最終設問の次は送信画面へ
    goToSending();
  }
}

// 送信画面へ
function goToSending() {
  surveySection.style.display = "none";
  sendingSection.style.display = "block";
  resultSection.style.display = "none";

  // 送信処理開始
  submitAnswers();
}

// 送信処理
async function submitAnswers() {
  // userName, setNumberは、画面から再取得か、onStartSurvey時にグローバル管理してもOK
  const userName = userNameInput.value.trim();
  const setNumber = setNumberSelect.value;

  // POSTするデータ
  const postData = {
    name: userName,
    setNumber: setNumber,
    answers: answers,
  };

  // 再送用にデータを保持しておく方法も
  // 一旦、sendingErrorMessage, retryButtonを初期化
  sendingErrorMessage.style.display = "none";
  retryButton.style.display = "none";

  try {
    const response = await fetch(GAS_ENDPOINT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error("Response not ok");
    }
    // 成功時
    const responseText = await response.text();
    console.log("Response from GAS:", responseText);

    // 送信完了画面へ
    sendingSection.style.display = "none";
    resultSection.style.display = "block";
  } catch (error) {
    console.error("Submit error:", error);
    sendingErrorMessage.style.display = "block";
    retryButton.style.display = "inline-block";
  }
}

// 「再送信」ボタン押下時
function onRetrySubmit() {
  submitAnswers();
}
