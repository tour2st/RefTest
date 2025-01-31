// main.js

/**
 * ▼ Google Apps Script のWebアプリURL
 *   (「ウェブアプリとしてデプロイ」→アクセスできるユーザー: 「全員（匿名含む）」)
 */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzThxGwmaBTFjOme_H2V5LbIbLKMCZnzsO5W3MBi9r52mXRAYeRikrmHMxT-OZD7BACmw/exec";

// 設問データ
let setsData = {};

// 現在のセットと質問インデックス
let currentSet = null;
let currentQuestionIndex = 0;

// ユーザーの回答を格納
let answers = [];

// ページ要素取得
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

// ページ読み込み時の処理
window.addEventListener("load", async () => {
  // sets.jsonを取得
  try {
    const response = await fetch("config/sets.json");
    setsData = await response.json();
    console.log("sets.json loaded:", setsData);

    // セット番号の選択肢を動的に生成（セットが増えた場合に対応）
    populateSetNumberOptions();
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

/**
 * セット番号の選択肢を動的に生成
 */
function populateSetNumberOptions() {
  const sets = Object.keys(setsData);
  sets.forEach(set => {
    const option = document.createElement("option");
    option.value = set;
    option.textContent = set;
    setNumberSelect.appendChild(option);
  });
}

/**
 * 「アンケート開始」ボタン押下時
 */
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

  // 選択されたセットのデータを取得
  if (!setsData[setNumber]) {
    alert("選択したセットが見つかりません。");
    return;
  }
  currentSet = setsData[setNumber];

  // 回答格納用配列を初期化
  answers = currentSet.questions.map(q => ({
    questionIndex: q.questionIndex,
    naturalness: null,
    reproduction: null
  }));

  // 画面遷移
  userInfoSection.style.display = "none";
  surveySection.style.display = "block";
  sendingSection.style.display = "none";
  resultSection.style.display = "none";

  // 最初の質問を表示
  currentQuestionIndex = 0;
  updateSurveyUI();
}

/**
 * アンケート画面を更新（現在の質問を表示）
 */
function updateSurveyUI() {
  const totalQuestions = currentSet.questions.length;
  currentQuestionNumberSpan.textContent = (currentQuestionIndex + 1).toString();
  totalQuestionNumberSpan.textContent = totalQuestions.toString();

  const questionData = currentSet.questions[currentQuestionIndex];

  // 音声ファイルのソースを設定
  refAudioSource.src = questionData.refAudio;
  method1AudioSource.src = questionData.method1Audio;
  method2AudioSource.src = questionData.method2Audio;

  // 音声の再読み込み
  refAudio.load();
  method1Audio.load();
  method2Audio.load();

  // 既存の回答をラジオボタンに反映
  const answer = answers[currentQuestionIndex];
  setRadioValue("naturalness", answer.naturalness);
  setRadioValue("reproduction", answer.reproduction);

  // 「前へ」ボタンの有効/無効設定
  prevButton.disabled = (currentQuestionIndex === 0);
}

/**
 * ラジオボタンの値を設定
 */
function setRadioValue(groupName, value) {
  const radios = document.querySelectorAll(`input[name="${groupName}"]`);
  radios.forEach(radio => {
    radio.checked = (radio.value === value);
  });
}

/**
 * 現在の質問の回答を保存
 */
function saveCurrentAnswers() {
  const naturalnessValue = getRadioValue("naturalness");
  const reproductionValue = getRadioValue("reproduction");

  answers[currentQuestionIndex].naturalness = naturalnessValue;
  answers[currentQuestionIndex].reproduction = reproductionValue;
}

/**
 * ラジオボタンの選択値を取得
 */
function getRadioValue(groupName) {
  const radios = document.querySelectorAll(`input[name="${groupName}"]`);
  for (const radio of radios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return null;
}

/**
 * 「前へ」ボタン押下時
 */
function onPrevQuestion() {
  // 現在の回答を保存
  saveCurrentAnswers();

  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    updateSurveyUI();
  }
}

/**
 * 「次へ」ボタン押下時
 */
function onNextQuestion() {
  // 現在の回答を保存
  saveCurrentAnswers();

  const answer = answers[currentQuestionIndex];
  if (!answer.naturalness || !answer.reproduction) {
    alert("未回答の項目があります。");
    return;
  }

  const totalQuestions = currentSet.questions.length;
  if (currentQuestionIndex < totalQuestions - 1) {
    // 次の質問へ
    currentQuestionIndex++;
    updateSurveyUI();
  } else {
    // 最終質問の次は送信画面へ
    goToSending();
  }
}

/**
 * 送信画面へ遷移
 */
function goToSending() {
  surveySection.style.display = "none";
  sendingSection.style.display = "block";
  resultSection.style.display = "none";

  // 回答送信処理開始
  submitAnswers();
}

/**
 * 回答送信処理（FormDataを使用）
 */
async function submitAnswers() {
  const userName = userNameInput.value.trim();
  const setNumber = setNumberSelect.value;

  const postData = {
    name: userName,
    setNumber: setNumber,
    answers: answers
  };

  // FormDataオブジェクトを作成
  const formData = new FormData();
  formData.append("json", JSON.stringify(postData));

  // エラーメッセージと再送信ボタンを初期化
  sendingErrorMessage.style.display = "none";
  retryButton.style.display = "none";

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`サーバーエラー: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("GASからのレスポンス:", responseText);

    // 送信完了画面へ遷移
    sendingSection.style.display = "none";
    resultSection.style.display = "block";

  } catch (error) {
    console.error("送信エラー:", error);
    sendingErrorMessage.style.display = "block";
    retryButton.style.display = "inline-block";
  }
}

/**
 * 「再送信」ボタン押下時
 */
function onRetrySubmit() {
  submitAnswers();
}
