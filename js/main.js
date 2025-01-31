/***************************************************************
 * main.js
 * 
 *  - ユーザーが sets.json のファイル名を入力 → 読み込む
 *  - setNumber を選択 → その questions[] を使って問題を生成
 *  - 1ページ1問、Next/Prevで移動
 *  - 各問題には refAudio, method1Audio, method2Audio を再生できるように表示
 *  - 「自然性」「話者性」の2サブ質問(4択)を回答
 *  - 全部回答後 → まとめて送信 → 送信中/完了画面
 **************************************************************/

// Google Apps Script のURL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxtl3ko1Duk4k-Vjwl5GJvGv72pyH4bUFGSM3swGiAWtpAgwqSrlY05StTPwrwK4jzQ/exec";

// sets.jsonの読み込んだデータ全体
let setsData = null;

// 選択された setNumber (set1, set2, ...)
let currentSetNumber = null;

// 現在の問題一覧
// e.g. questions = setsData[setNumber].questions
let questions = [];

// 回答配列: answersState[i] = { questionIndex, naturalness, reproduction }
let answersState = [];

// 現在の問題インデックス (0-based)
let currentQuestionIndex = 0;

/**
 * ページが読み込まれたとき
 */
window.addEventListener('DOMContentLoaded', () => {
  // ボタンイベント設定
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
  document.getElementById('prevBtn').addEventListener('click', onPrev);
  document.getElementById('nextBtn').addEventListener('click', onNext);
  document.getElementById('resendBtn').addEventListener('click', onResend);
});

/**
 * 1) アンケート開始ボタン
 *    - sets.jsonを読み込み → setNumberの questions を抽出 → 画面遷移
 */
function startSurvey() {
  const setsFilePath = document.getElementById('setsFilePath').value.trim();
  if (!setsFilePath) {
    alert("sets.json のファイルパスを入力してください。");
    return;
  }

  const userName = document.getElementById('userName').value.trim();
  if (!userName) {
    alert("お名前を入力してください。");
    return;
  }

  const setNumber = getRadioValue("setNumber");
  if (!setNumber) {
    alert("セット番号を選択してください。");
    return;
  }

  // sets.json をfetchで読み込む
  fetch(setsFilePath)
    .then(res => res.json())
    .then(data => {
      setsData = data;
      if (!setsData[setNumber]) {
        alert("sets.json の中に " + setNumber + " が見つかりません。");
        return;
      }

      // 質問リストを抽出
      questions = setsData[setNumber].questions;
      if (!questions || questions.length === 0) {
        alert("セット " + setNumber + " に質問がありません。");
        return;
      }

      // 回答配列を初期化
      answersState = questions.map(q => ({
        questionIndex: q.questionIndex,
        naturalness: null,
        reproduction: null
      }));

      // グローバル変数に保存
      currentSetNumber = setNumber;

      // 画面を切り替え
      document.getElementById('user-info-section').style.display = 'none';
      document.getElementById('survey-section').style.display = 'block';

      // 最初の問題を表示
      currentQuestionIndex = 0;
      renderQuestion();
      updateNavButtons();
    })
    .catch(err => {
      console.error(err);
      alert("sets.json の読み込みに失敗しました。");
    });
}

/**
 * 2) 現在の問題を画面に描画
 *    - refAudio, method1Audio, method2Audio を再生可能に
 *    - 「どちらが自然に聞こえるか？ (1～4)」「どちらが参照音声を再現しているか？ (1～4)」
 */
function renderQuestion() {
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = "";

  const q = questions[currentQuestionIndex];
  // q = { questionIndex, refAudio, method1Audio, method2Audio }

  const questionBlock = document.createElement('div');
  questionBlock.classList.add('question-block');

  // タイトル (例: 質問1)
  const title = document.createElement('h3');
  title.textContent = `質問 ${q.questionIndex}`;
  questionBlock.appendChild(title);

  // 音声プレイヤー: 参照音声
  questionBlock.appendChild(createAudioPlayer(q.refAudio, "参照音声"));
  // 音声プレイヤー: method1
  questionBlock.appendChild(createAudioPlayer(q.method1Audio, "Method1"));
  // 音声プレイヤー: method2
  questionBlock.appendChild(createAudioPlayer(q.method2Audio, "Method2"));

  // ------ 自然性(自然さ) ------
  const naturalnessLabel = document.createElement('p');
  naturalnessLabel.textContent = "どちらが自然に聞こえますか？ (1～4)";
  questionBlock.appendChild(naturalnessLabel);

  const nChoices = document.createElement('div');
  // 1行1択にする
  nChoices.innerHTML = `
    <label style="display:block;"><input type="radio" name="naturalness" value="1">1</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="2">2</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="3">3</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="4">4</label>
  `;
  questionBlock.appendChild(nChoices);

  // ------ 話者性(再現度) ------
  const reproductionLabel = document.createElement('p');
  reproductionLabel.textContent = "どちらが参照音声を再現できていますか？ (1～4)";
  questionBlock.appendChild(reproductionLabel);

  const rChoices = document.createElement('div');
  rChoices.innerHTML = `
    <label style="display:block;"><input type="radio" name="reproduction" value="1">1</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="2">2</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="3">3</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="4">4</label>
  `;
  questionBlock.appendChild(rChoices);

  questionContainer.appendChild(questionBlock);

  // 過去に回答した内容があればラジオボタンを復元
  const saved = answersState[currentQuestionIndex];
  if (saved) {
    checkRadio("naturalness", saved.naturalness);
    checkRadio("reproduction", saved.reproduction);
  }
}

/**
 * 補助: 音声プレイヤー生成
 */
function createAudioPlayer(src, labelText) {
  const container = document.createElement('div');

  const label = document.createElement('p');
  label.textContent = labelText;
  container.appendChild(label);

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = src; // sets.jsonで指定されたパス
  container.appendChild(audio);

  return container;
}

/**
 * 補助: ラジオボタンをプログラム的にチェック
 */
function checkRadio(nameVal, valueVal) {
  if (!valueVal) return;
  const radios = document.getElementsByName(nameVal);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].value === valueVal) {
      radios[i].checked = true;
      break;
    }
  }
}

/**
 * Prevボタン (現在の回答を保存して前へ)
 */
function onPrev() {
  saveCurrentAnswer(); // 未回答でも戻るのは許容している例
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * Nextボタン (未回答なら警告)
 *  - 最終問題なら送信へ
 */
function onNext() {
  if (!saveCurrentAnswer()) {
    alert("未回答項目があります。");
    return;
  }

  if (currentQuestionIndex === questions.length - 1) {
    // 最終問題 → 送信
    goSendingPage();
  } else {
    // 次の問題へ
    currentQuestionIndex++;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * 現在の回答を answersState に保存
 * 未回答があれば false
 */
function saveCurrentAnswer() {
  const nVal = getRadioValue("naturalness");
  const rVal = getRadioValue("reproduction");
  if (!nVal || !rVal) {
    return false;
  }
  answersState[currentQuestionIndex].naturalness = nVal;
  answersState[currentQuestionIndex].reproduction = rVal;
  return true;
}

/**
 * ラジオボタンの選択値を取得
 */
function getRadioValue(nameVal) {
  const radios = document.getElementsByName(nameVal);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return null;
}

/**
 * Prev/Nextボタンの表示やテキスト更新
 */
function updateNavButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (currentQuestionIndex === 0) {
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'inline-block';
  }

  if (currentQuestionIndex === questions.length - 1) {
    nextBtn.textContent = "Submit";
  } else {
    nextBtn.textContent = "Next";
  }
}

/**
 * 最終問題回答後 → 「送信中...」画面へ
 */
function goSendingPage() {
  document.getElementById('survey-section').style.display = 'none';
  document.getElementById('sending-section').style.display = 'block';

  sendAnswers();
}

/**
 * 回答送信 (FormDataでPOST)
 */
function sendAnswers() {
  const userName = document.getElementById('userName').value.trim();
  const payloadObj = {
    name: userName,
    setNumber: currentSetNumber,
    answers: answersState
  };

  // 再送信用
  window.lastPayload = payloadObj;

  const formData = new FormData();
  formData.append("payload", JSON.stringify(payloadObj));

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        document.getElementById('sending-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';
      } else {
        alert("サーバーエラー: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("送信に失敗しました。再送信してください。");
    });
}

/**
 * 再送信ボタン
 */
function onResend() {
  if (!window.lastPayload) {
    alert("再送信データがありません。");
    return;
  }

  const formData = new FormData();
  formData.append("payload", JSON.stringify(window.lastPayload));

  fetch(SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        document.getElementById('sending-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';
      } else {
        alert("サーバーエラー: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("再送信に失敗しました。");
    });
}
