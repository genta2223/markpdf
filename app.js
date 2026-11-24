/**
 * MarkPDF - AI出力・画像コピペ即PDFエディタ (公開実用版)
 * 純粋な HTML / CSS / Vanilla JS のみで構築（外部API通信一切なし）
 */

// --- 1. IndexedDB による画像データ永続化管理 ---
const DB_NAME = 'MarkPdfDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = (e) => reject(e);
  });
}

function saveImageToDB(id, dataUrl, name) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, dataUrl, name, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

function getAllImagesFromDB() {
  return new Promise((resolve) => {
    if (!db) return resolve({});
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const map = {};
      (request.result || []).forEach(item => {
        map[item.id] = item;
      });
      resolve(map);
    };
    request.onerror = () => resolve({});
  });
}

function deleteImageFromDB(id) {
  return new Promise((resolve) => {
    if (!db) return resolve();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

function clearAllImagesFromDB() {
  return new Promise((resolve) => {
    if (!db) return resolve();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
  });
}

// メモリ上の画像キャッシュ: id -> { id, dataUrl, name }
const imageCache = {};

// --- 2. クライアントサイド画像自動圧縮（Canvasによる最大1600px制限） ---
const MAX_IMAGE_WIDTH = 1600;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 横幅が MAX_IMAGE_WIDTH を超える場合は比率を保って縮小
        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round((height * MAX_IMAGE_WIDTH) / width);
          width = MAX_IMAGE_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG 圧縮 (品質 0.88)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

// --- 3. 動的サンプルグラフ（Canvas で描画するビジネスレポート図表）の生成 ---
function generateSampleChartDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 枠線
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // タイトル
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 32px "Segoe UI", "Yu Gothic UI", sans-serif';
  ctx.fillText('図 1.1：AI導入による四半期別 作業時間削減と生産性向上推移', 50, 65);

  // サブタイトル
  ctx.fillStyle = '#64748b';
  ctx.font = '20px "Segoe UI", "Yu Gothic UI", sans-serif';
  ctx.fillText('（単位: 時間/月、調査対象: 開発・企画・管理部門 120名）', 50, 100);

  // グラフエリア設定
  const originX = 120;
  const originY = 440;
  const chartW = 980;
  const chartH = 280;

  // 目盛り線
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = originY - (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(originX, y);
    ctx.lineTo(originX + chartW, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${i * 25}h`, originX - 15, y + 6);
  }

  // データ定義
  const quarters = ['2025 Q1 (導入前)', '2025 Q2 (試用期)', '2025 Q3 (本格運用)', '2025 Q4 (定着期)'];
  const beforeData = [100, 92, 60, 24]; // 従来作業時間（低減）
  const productivity = [20, 38, 75, 95]; // 生産性指標（上昇）

  const barW = 75;
  const gap = chartW / quarters.length;

  quarters.forEach((q, idx) => {
    const x = originX + gap * idx + 70;

    // 従来作業時間バー（青グラデーション）
    const bHeight = (beforeData[idx] / 100) * chartH;
    const grad1 = ctx.createLinearGradient(0, originY - bHeight, 0, originY);
    grad1.addColorStop(0, '#3b82f6');
    grad1.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.roundRect(x, originY - bHeight, barW, bHeight, [6, 6, 0, 0]);
    ctx.fill();

    // 数値表示
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${beforeData[idx]}h`, x + barW / 2, originY - bHeight - 10);

    // 生産性バー（緑グラデーション）
    const pHeight = (productivity[idx] / 100) * chartH;
    const grad2 = ctx.createLinearGradient(0, originY - pHeight, 0, originY);
    grad2.addColorStop(0, '#10b981');
    grad2.addColorStop(1, '#047857');
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.roundRect(x + barW + 12, originY - pHeight, barW, pHeight, [6, 6, 0, 0]);
    ctx.fill();

    // 数値表示
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`+${productivity[idx]}%`, x + barW + 12 + barW / 2, originY - pHeight - 10);

    // X軸ラベル
    ctx.fillStyle = '#334155';
    ctx.font = '16px "Yu Gothic UI", sans-serif';
    ctx.fillText(q, x + barW + 6, originY + 30);
  });

  // 凡例
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(820, 48, 22, 14);
  ctx.fillStyle = '#334155';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('平均残業・作業時間', 850, 60);

  ctx.fillStyle = '#10b981';
  ctx.fillRect(820, 74, 22, 14);
  ctx.fillStyle = '#334155';
  ctx.fillText('業務達成スコア', 850, 86);

  return canvas.toDataURL('image/png');
}

// --- 4. marked.js のカスタムレンダラー（画像IDを実データに解決） ---
function setupMarked() {
  const renderer = new marked.Renderer();

  renderer.image = function(token) {
    let href = token.href || '';
    const text = token.text || '';
    const title = token.title ? ` title="${token.title}"` : '';

    if (href.startsWith('image:')) {
      const imgId = href.replace('image:', '').trim();
      const cached = imageCache[imgId];
      if (cached && cached.dataUrl) {
        href = cached.dataUrl;
      }
    }

    const captionHtml = text ? `<figcaption>${text}</figcaption>` : '';
    return `<figure class="content-figure"><img src="${href}" alt="${text}"${title} loading="lazy">${captionHtml}</figure>`;
  };

  marked.use({
    renderer: renderer,
    gfm: true,
    breaks: true
  });
}

// --- 5. DOM 要素の参照 ---
const editor = document.getElementById('editor');
const previewPage = document.getElementById('preview-page');
const previewContent = document.getElementById('preview-content');
const themeSelect = document.getElementById('theme-select');
const charCount = document.getElementById('char-count');
const saveStatus = document.getElementById('save-status');
const imageTray = document.getElementById('image-tray');
const imageCount = document.getElementById('image-count');
const trayItems = document.getElementById('tray-items');
const dropOverlay = document.getElementById('drop-overlay');
const fileInput = document.getElementById('file-input');
const mdFileInput = document.getElementById('md-file-input');
const resizer = document.getElementById('resizer');
const editorPane = document.querySelector('.editor-pane');

// --- 6. 初期サンプル Markdown テキスト ---
const INITIAL_SAMPLE_MARKDOWN = `# AI導入成果報告書：ドキュメント自動整形による業務効率化

---

## 1. 導入背景と目的

全社的なDX推進の一環として、各事業部における**非構造化テキスト（AI出力ログ・議事録・顧客フィードバック）のレポート化および顧客向け PDF 出力業務**の自動化を行いました。

> **本取り組みの目的:**  
> 「VS Code や高価なデザインソフトを使わず、ブラウザのコピペ操作だけで 10 秒以内に商業品質の A4 PDF を出力する」環境を構築し、全社的な業務リードタイムを大幅に圧縮すること。

---

## 2. 定量的導入効果（三線表）

| 評価指標 | 導入前（従来手動） | 導入後（MarkPDF） | 改善率 | 主な要因 |
| :--- | :--- | :--- | :--- | :--- |
| **資料作成平均所要時間** | 4.8 時間 | **0.4 時間** | **-91.6%** | AI出力テキストの直接流し込み |
| **図表挿入・位置調整時間** | 45 分 | **2 分** | **-95.5%** | **Ctrl+V で即座にID短縮挿入** |
| **印刷時のレイアウト崩れ** | 頻発（月平均24件） | **0 件** | **100% 撲滅** | **1ページ1画像の自動改ページ制御** |
| **情報漏洩インシデント** | 懸念あり | **0 件** | **完全安全** | **完全クライアントサイド処理** |

---

## 3. 四半期別実績推移グラフ

![図 1.1：AI導入による四半期別 作業時間削減と生産性向上推移](image:sample_chart_1)

---

## 4. セキュリティとデータ保護方針

本システムは、外部への API 通信やクラウドサーバーへのデータ送信を一切行いません。機密性の高い社内データや顧客情報が含まれる場合でも、安全にローカルブラウザ内で PDF 化が完結します。

\`\`\`python
# 完全クライアントサイドのゼロ送信アーキテクチャ
def verify_security_boundary():
    external_network_requests = 0
    assert external_network_requests == 0, "No data leaves this browser."
    return "All processing is purely local!"
\`\`\`

> **運用上の注意:**  
> A4 印刷時における画像の突き抜けや改ページまたぎを防ぐため、**1ページにつき画像1枚までの自動配置ルール**が常時適用されます。
`;

// --- 7. プレビュー更新と「1ページ1画像」の自動改ページ制御 ---
function renderMarkdown() {
  const mdText = editor.value;

  // marked.js による Markdown パース
  const rawHtml = marked.parse(mdText);

  // DOMPurify による堅牢な XSS サニタイズ
  // 自作の figure, figcaption, class 属性, image: / data: スキームは維持
  let cleanHtml = rawHtml;
  if (window.DOMPurify) {
    cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['figure', 'figcaption'],
      ADD_ATTR: ['loading', 'target', 'class'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|image|blob|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  }

  previewContent.innerHTML = cleanHtml;
  charCount.textContent = `${mdText.length} 文字`;

  // 「1ページ1画像」の自動改ページ制約を適用
  enforceOneImagePerPage();

  // localStorage への保存
  localStorage.setItem('markpdf_content', mdText);
  saveStatus.textContent = '💾 自動保存済み';
}

/**
 * プレビュー内の画像要素を走査し、
 * 2枚目以降の画像の直前に自動改ページクラス（auto-page-break）を付与する
 */
function enforceOneImagePerPage() {
  const figures = previewContent.querySelectorAll('figure.content-figure, img:not(figure img)');
  if (figures.length <= 1) return;

  figures.forEach((fig, index) => {
    if (index > 0) {
      fig.classList.add('auto-page-break');
    } else {
      fig.classList.remove('auto-page-break');
    }
  });
}

let saveTimer = null;
editor.addEventListener('input', () => {
  saveStatus.textContent = '✏️ 入力中...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    renderMarkdown();
  }, 100);
});

// --- 8. 画像の登録・圧縮・ID化・カーソル位置への挿入 ---
let imageCounter = 0;

async function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;

  saveStatus.textContent = '⚡ 画像圧縮中...';

  try {
    // Canvas で最大横幅 1600px に自動圧縮
    const compressedDataUrl = await compressImage(file);

    imageCounter++;
    const id = `img_${Date.now()}_${imageCounter}`;
    const name = file.name || `image_${imageCounter}.png`;

    // キャッシュと IndexedDB に保存
    imageCache[id] = { id, dataUrl: compressedDataUrl, name };
    await saveImageToDB(id, compressedDataUrl, name);

    // エディタのカーソル位置に短い参照記号を挿入
    insertAtCursor(`\n![${name}](image:${id})\n`);

    updateImageTray();
    renderMarkdown();
  } catch (err) {
    console.error('画像圧縮エラー:', err);
    alert('画像の処理に失敗しました: ' + err.message);
  } finally {
    saveStatus.textContent = '💾 自動保存済み';
  }
}

function insertAtCursor(text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const current = editor.value;

  editor.value = current.substring(0, start) + text + current.substring(end);
  editor.selectionStart = editor.selectionEnd = start + text.length;
  editor.focus();
}

// クリップボードからの直接画像ペースト（Ctrl + V）
editor.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let hasImage = false;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      handleImageFile(file);
      hasImage = true;
    }
  }

  // 画像が含まれていた場合はデフォルトのペースト（Base64の文字直貼り）を防止
  if (hasImage) {
    e.preventDefault();
  }
});

// ドラッグ＆ドロップ対応
const dropzone = document.getElementById('editor-dropzone');

['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
  });
});

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files && files.length > 0) {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    });
  }
});

// 画像ファイル選択ダイアログ
fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    Array.from(files).forEach(file => handleImageFile(file));
  }
  fileInput.value = '';
});

// --- 9. 画像管理トレイの更新 ---
function updateImageTray() {
  const keys = Object.keys(imageCache);
  imageCount.textContent = keys.length;
  trayItems.innerHTML = '';

  if (keys.length === 0) {
    imageTray.style.display = 'none';
    return;
  }
  imageTray.style.display = 'flex';

  keys.forEach(id => {
    const item = imageCache[id];
    const card = document.createElement('div');
    card.className = 'tray-card';

    card.innerHTML = `
      <img src="${item.dataUrl}" class="tray-thumb" alt="${item.name}" title="クリックで本文に再挿入">
      <span class="tray-name" title="${item.name}">${id}</span>
      <span class="tray-delete" title="画像を削除">✕</span>
    `;

    // サムネイルクリックで再挿入
    card.querySelector('.tray-thumb').addEventListener('click', () => {
      insertAtCursor(`\n![${item.name}](image:${id})\n`);
      renderMarkdown();
    });

    // 削除ボタン
    card.querySelector('.tray-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      delete imageCache[id];
      await deleteImageFromDB(id);
      updateImageTray();
      renderMarkdown();
    });

    trayItems.appendChild(card);
  });
}

// --- 10. ツールバーの補助ボタン ---
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const insertStr = btn.getAttribute('data-insert');
    const wrapStr = btn.getAttribute('data-wrap');

    if (insertStr) {
      insertAtCursor(insertStr);
    } else if (wrapStr) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selected = editor.value.substring(start, end) || 'テキスト';
      const replacement = `${wrapStr}${selected}${wrapStr}`;
      editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
      editor.selectionStart = start + wrapStr.length;
      editor.selectionEnd = start + wrapStr.length + selected.length;
      editor.focus();
    }
    renderMarkdown();
  });
});

// --- 11. 入出力・サンプル管理ボタンの充実 ---

// .md 読込
document.getElementById('btn-open-md').addEventListener('click', () => {
  mdFileInput.click();
});

mdFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      editor.value = ev.target.result;
      renderMarkdown();
    };
    reader.readAsText(file, 'utf-8');
  }
  mdFileInput.value = '';
});

// .md 保存
document.getElementById('btn-save-md').addEventListener('click', () => {
  const content = editor.value;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// サンプル復元
document.getElementById('btn-load-sample').addEventListener('click', async () => {
  if (confirm('現在の内容をサンプルレポートで復元しますか？')) {
    // サンプルチャートを生成して登録
    const sampleChartData = generateSampleChartDataUrl();
    imageCache['sample_chart_1'] = {
      id: 'sample_chart_1',
      dataUrl: sampleChartData,
      name: '四半期推移グラフ.png'
    };
    await saveImageToDB('sample_chart_1', sampleChartData, '四半期推移グラフ.png');

    editor.value = INITIAL_SAMPLE_MARKDOWN;
    updateImageTray();
    renderMarkdown();
  }
});

// 新規クリア
document.getElementById('btn-clear').addEventListener('click', async () => {
  if (confirm('エディタの内容と挿入画像をすべてクリアしますか？')) {
    editor.value = '';
    for (const key of Object.keys(imageCache)) {
      delete imageCache[key];
    }
    await clearAllImagesFromDB();
    updateImageTray();
    renderMarkdown();
  }
});

// デザインプリセット切り替え
themeSelect.addEventListener('change', () => {
  const selectedTheme = themeSelect.value;
  previewPage.className = `a4-page theme-${selectedTheme}`;
  localStorage.setItem('markpdf_theme', selectedTheme);
});

// PDF として保存（印刷）
document.getElementById('btn-print').addEventListener('click', () => {
  window.print();
});

// ショートカットキー対応 (Ctrl+P で即印刷)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    window.print();
  }
});

// --- 12. 左右ペインのスプリッター（幅リサイズ） ---
let isResizing = false;

resizer.addEventListener('mousedown', () => {
  isResizing = true;
  resizer.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const containerWidth = document.querySelector('.app-body').offsetWidth;
  const newLeftWidth = e.clientX;
  if (newLeftWidth > 280 && containerWidth - newLeftWidth > 320) {
    editorPane.style.width = `${newLeftWidth}px`;
  }
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = 'default';
  }
});

// --- 13. アプリ初期化 ---
async function initApp() {
  setupMarked();

  // テーマの復元
  const savedTheme = localStorage.getItem('markpdf_theme') || 'business';
  themeSelect.value = savedTheme;
  previewPage.className = `a4-page theme-${savedTheme}`;

  // IndexedDB の初期化と既存画像の読み込み
  try {
    await initDB();
    const storedImages = await getAllImagesFromDB();
    Object.assign(imageCache, storedImages);
  } catch (err) {
    console.error('IndexedDB load error:', err);
  }

  // 初回アクセス時またはコンテンツ保存なしの場合：サンプルチャートと初期レポートを自動投入
  const savedContent = localStorage.getItem('markpdf_content');
  if (!savedContent || savedContent.trim().length === 0) {
    const sampleChartData = generateSampleChartDataUrl();
    imageCache['sample_chart_1'] = {
      id: 'sample_chart_1',
      dataUrl: sampleChartData,
      name: '四半期推移グラフ.png'
    };
    await saveImageToDB('sample_chart_1', sampleChartData, '四半期推移グラフ.png');
    editor.value = INITIAL_SAMPLE_MARKDOWN;
  } else {
    editor.value = savedContent;
  }

  updateImageTray();
  renderMarkdown();
}

window.addEventListener('DOMContentLoaded', initApp);
