/************************************************************
 * main.js
 * 
 *  - 1ページ1問ずつ表示
 *  - Next/Prevで問題遷移
 *  - 未回答なら進めない
 *  - 全問回答後にまとめて送信
 *  - 送信中...画面に遷移、レスポンスで送信完了画面表示
 *  - 再送信ボタンを配置
 ************************************************************/

// === Google Apps Script のWebアプリURLを設定 ===
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfRyg7rskhH2OXWifx-MIMk4RXmj3GgEekB0OJwaiO-oSwkijTBO9eK0ofj7xEqOKQrQ/exec";

// === 質問データの例 (2問) ===
//   本来は音声ファイルや参照ラベルを付ける想定だが、ここでは簡潔に
const questionData = [
  {
    questionIndex: 1,
    naturalnessLabel: "どちらが自然に聞こえますか？ (1～4)",
    reproductionLabel: "どちらが参照音声を再現できていますか？ (1～4)"
  },
  {
    questionIndex: 2,
    naturalnessLabel: "どちらが自然に聞こえますか？ (Q2)",
    reproductionLabel: "どちらが参照音声を再現できていますか？ (Q2)"
  }
];

// 現在の問題インデックス (0-based)
let currentQuestionIndex = 0;

// 回答の配列: [{ questionIndex, naturalness, reproduction }, ...]
let answersState = [];

// --- ページロード時の処理 ---
window.addEventListener('DOMContentLoaded', () => {
  // ボタンイベント登録
  document.getElementById('startSurveyBtn').addEventListener('click', startSurvey);
  document.getElementById('prevBtn').addEventListener('click', onPrev);
  document.getElementById('nextBtn').addEventListener('click', onNext);
  document.getElementById('resendBtn').addEventListener('click', onResend);
});

/**
 * (1) アンケート開始ボタン
 */
function startSurvey() {
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

  // 回答配列を初期化
  answersState = questionData.map(q => ({
    questionIndex: q.questionIndex,
    naturalness: null,
    reproduction: null
  }));

  // 画面切り替え
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('survey-section').style.display = 'block';

  // 最初の問題を描画
  currentQuestionIndex = 0;
  renderQuestion();
  updateNavButtons();
}

/**
 * (2) 現在の問題を画面に描画
 */
function renderQuestion() {
  const questionContainer = document.getElementById('question-container');
  questionContainer.innerHTML = ""; // 初期化

  // questionData から現在の問題を取得
  const q = questionData[currentQuestionIndex];

  // 質問ブロック全体
  const questionBlock = document.createElement('div');
  questionBlock.classList.add('question-block');

  // タイトル (例: 質問1)
  const title = document.createElement('h3');
  title.textContent = `質問 ${q.questionIndex}`;
  questionBlock.appendChild(title);

  // 自然さ (改行表示)
  const nLabel = document.createElement('p');
  nLabel.textContent = q.naturalnessLabel;
  questionBlock.appendChild(nLabel);

  const nChoices = document.createElement('div');
  nChoices.innerHTML = `
    <label style="display:block;"><input type="radio" name="naturalness" value="1">1</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="2">2</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="3">3</label>
    <label style="display:block;"><input type="radio" name="naturalness" value="4">4</label>
  `;
  questionBlock.appendChild(nChoices);

  // 再現度 (改行表示)
  const rLabel = document.createElement('p');
  rLabel.textContent = q.reproductionLabel;
  questionBlock.appendChild(rLabel);

  const rChoices = document.createElement('div');
  rChoices.innerHTML = `
    <label style="display:block;"><input type="radio" name="reproduction" value="1">1</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="2">2</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="3">3</label>
    <label style="display:block;"><input type="radio" name="reproduction" value="4">4</label>
  `;
  questionBlock.appendChild(rChoices);

  questionContainer.appendChild(questionBlock);

  // 既に回答があれば、ラジオを復元
  const saved = answersState[currentQuestionIndex];
  if (saved) {
    checkRadio("naturalness", saved.naturalness);
    checkRadio("reproduction", saved.reproduction);
  }
}

/**
 * (2)-補助: ラジオボタンをプログラム的にチェック
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
 * (3) Prevボタン
 */
function onPrev() {
  // 今の回答を保存
  saveCurrentAnswer(); // 戻りは未回答でも許可してもOK

  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * (4) Nextボタン
 */
function onNext() {
  // 未回答チェック
  const success = saveCurrentAnswer();
  if (!success) {
    alert("未回答の項目があります。");
    return;
  }

  // 最終問題かどうか
  if (currentQuestionIndex === questionData.length - 1) {
    // → 送信処理へ
    goSendingPage();
  } else {
    // 次の問題へ
    currentQuestionIndex++;
    renderQuestion();
    updateNavButtons();
  }
}

/**
 * (4)-補助: 現在の回答を保存
 * 未回答があれば false を返す
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
 * Prev/Nextボタンの表示切り替え
 */
function updateNavButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // 最初の問題なら Prev 非表示
  if (currentQuestionIndex === 0) {
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'inline-block';
  }

  // 最後の問題なら Next ボタンを "Submit" 表記
  if (currentQuestionIndex === questionData.length - 1) {
    nextBtn.textContent = "Submit";
  } else {
    nextBtn.textContent = "Next";
  }
}

/**
 * (5) 全回答後 → 送信中画面へ遷移
 */
function goSendingPage() {
  document.getElementById('survey-section').style.display = 'none';
  document.getElementById('sending-section').style.display = 'block';

  sendAnswers();
}

/**
 * (5)-補助: 回答送信
 */
function sendAnswers() {
  const userName = document.getElementById('userName').value.trim();
  const setNumber = getRadioValue("setNumber");

  // POSTするデータ
  const payloadObj = {
    name: userName,
    setNumber: setNumber,
    answers: answersState
  };

  // 再送信用にグローバルへ保存
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
        // 送信完了画面へ
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
 * (6) 再送信ボタン
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
