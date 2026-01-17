import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// ========================================
// グローバル変数
// ========================================// Three.js オブジェクト
let scene, camera, renderer, controls;
let directionalLight, pointLight1, pointLight2;
let models = [];
let selectedModelIndex = -1;
let loadMode = 'replace'; // 'replace' または 'add'

// 座標軸ビューアー用
let axesScene, axesCamera, axesRenderer;
let modelIdCounter = 0;

// ModelDataクラス
class ModelData {
    constructor(name, object3D, format, fileSize) {
        this.id = modelIdCounter++;
        this.name = name;
        this.object3D = object3D;
        this.originalMaterials = new Map();
        this.metadata = {
            format: format,
            loadedAt: new Date(),
            fileSize: fileSize
        };
    }
}

// DOM要素
const canvas = document.getElementById('canvas3d');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const loadingIndicator = document.getElementById('loadingIndicator');
const lightIntensitySlider = document.getElementById('lightIntensity');
const lightValue = document.getElementById('lightValue');
const bgColorPicker = document.getElementById('bgColor');
const wireframeToggle = document.getElementById('wireframeToggle');
const resetViewBtn = document.getElementById('resetView');

// 新規: 平面ビューボタン
const viewXYBtn = document.getElementById('viewXY');
const viewYZBtn = document.getElementById('viewYZ');
const viewZXBtn = document.getElementById('viewZX');

// 新規: 読み込みモードラジオボタン
const loadModeRadios = document.getElementsByName('loadMode');

// 新規: トランスフォームパネル要素
const transformPanel = document.getElementById('transformPanel');
const selectedModelName = document.getElementById('selectedModelName');
const posXInput = document.getElementById('posX');
const posYInput = document.getElementById('posY');
const posZInput = document.getElementById('posZ');
const scaleXInput = document.getElementById('scaleX');
const scaleYInput = document.getElementById('scaleY');
const scaleZInput = document.getElementById('scaleZ');
const uniformScaleCheckbox = document.getElementById('uniformScale');
const rotXInput = document.getElementById('rotX');
const rotYInput = document.getElementById('rotY');
const rotZInput = document.getElementById('rotZ');
const loadModelBtn = document.getElementById('loadModelBtn');
const deleteModelBtn = document.getElementById('deleteModelBtn');
const duplicateModelBtn = document.getElementById('duplicateModelBtn');

// 新規: モデルリスト要素
const clearAllBtn = document.getElementById('clearAllBtn');

// 新規: 光源設定要素
const lightSettingsBtn = document.getElementById('lightSettingsBtn');
const lightPanel = document.getElementById('lightPanel');
const lightPosXInput = document.getElementById('lightPosX');
const lightPosYInput = document.getElementById('lightPosY');
const lightPosZInput = document.getElementById('lightPosZ');
const lightColorInput = document.getElementById('lightColor');
const closeTransformBtn = document.getElementById('closeTransformBtn');
const closeLightBtn = document.getElementById('closeLightBtn');
const showTransformPanelBtn = document.getElementById('showTransformPanelBtn');

// ========================================
// 初期化
// ========================================
function init() {
    // シーンの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    // カメラの作成
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(5, 5, 5);

    // レンダラーの設定
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false; // 座標軸ビューアーのために手動クリア

    // OrbitControlsの設定
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;

    // 座標軸ビューアーの設定
    setupAxesViewer();
    controls.minDistance = 1;
    controls.maxDistance = 100;

    // ライティングの設定
    setupLighting();

    // グリッドヘルパー
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 座標軸ヘルパーを追加（X軸:赤、Y軸:緑、Z軸:青）
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // イベントリスナーの設定
    setupEventListeners();

    // アニメーションループの開始
    animate();
}

// ========================================
// ライティング設定
// ========================================
function setupLighting() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 指向性ライト（メインライト）
    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // ポイントライト1（アクセントライト）
    pointLight1 = new THREE.PointLight(0x6366f1, 0.5, 50);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);

    // ポイントライト2（アクセントライト）
    pointLight2 = new THREE.PointLight(0x14b8a6, 0.5, 50);
    pointLight2.position.set(5, 5, -5);
    scene.add(pointLight2);
}

// ========================================
// イベントリスナー設定
// ========================================
function setupEventListeners() {
    // ウィンドウリサイズ
    window.addEventListener('resize', onWindowResize);

    // ファイル選択
    fileInput.addEventListener('change', handleFileSelect);

    // ドラッグ&ドロップ
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // コントロール
    lightIntensitySlider.addEventListener('input', handleLightIntensityChange);
    bgColorPicker.addEventListener('input', handleBgColorChange);
    wireframeToggle.addEventListener('change', handleWireframeToggle);
    resetViewBtn.addEventListener('click', resetView);

    // 新規: 平面ビューボタン
    viewXYBtn.addEventListener('click', setViewXY);
    viewYZBtn.addEventListener('click', setViewYZ);
    viewZXBtn.addEventListener('click', setViewZX);

    // 新規: 読み込みモード
    loadModeRadios.forEach(radio => {
        radio.addEventListener('change', handleLoadModeChange);
    });

    // 新規: トランスフォーム操作
    posXInput.addEventListener('input', handlePositionChange);
    posYInput.addEventListener('input', handlePositionChange);
    posZInput.addEventListener('input', handlePositionChange);
    scaleXInput.addEventListener('input', handleScaleChange);
    scaleYInput.addEventListener('input', handleScaleChange);
    scaleZInput.addEventListener('input', handleScaleChange);
    uniformScaleCheckbox.addEventListener('change', handleUniformScaleChange);
    rotXInput.addEventListener('input', handleRotationChange);
    rotYInput.addEventListener('input', handleRotationChange);
    rotZInput.addEventListener('input', handleRotationChange);

    // 新規: モデル管理ボタン
    loadModelBtn.addEventListener('click', handleLoadModel);
    deleteModelBtn.addEventListener('click', handleDeleteModel);
    duplicateModelBtn.addEventListener('click', handleDuplicateModel);
    clearAllBtn.addEventListener('click', handleClearAll);

    // 新規: 光源設定
    lightSettingsBtn.addEventListener('click', toggleLightPanel);
    lightPosXInput.addEventListener('input', handleLightPositionChange);
    lightPosYInput.addEventListener('input', handleLightPositionChange);
    lightPosZInput.addEventListener('input', handleLightPositionChange);
    lightColorInput.addEventListener('input', handleLightColorChange);

    // 新規: パネル閉じるボタン
    closeTransformBtn.addEventListener('click', () => hideTransformPanel());
    closeLightBtn.addEventListener('click', toggleLightPanel);

    // 新規: パネル表示ボタン
    showTransformPanelBtn.addEventListener('click', () => {
        transformPanel.classList.remove('hidden');
        showTransformPanelBtn.classList.add('hidden');
    });
}

// ========================================
// ファイル処理
// ========================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadModel(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    dropZone.classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (file) {
        loadModel(file);
    }
}

// ========================================
// モデル読み込み
// ========================================
function loadModel(file) {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    // ローディング表示
    showLoading();

    // 置き換えモードの場合、既存モデルをクリア
    if (loadMode === 'replace') {
        clearAllModels();
    }

    // ファイル拡張子に応じたローダーを選択
    const reader = new FileReader();
    reader.onload = function (e) {
        const arrayBuffer = e.target.result;

        try {
            switch (fileExtension) {
                case '.glb':
                case '.gltf':
                    loadGLTF(arrayBuffer, fileName, file.size);
                    break;
                case '.stl':
                    loadSTL(arrayBuffer, fileName, file.size);
                    break;
                case '.obj':
                    loadOBJ(arrayBuffer, fileName, file.size);
                    break;
                case '.fbx':
                    loadFBX(arrayBuffer, fileName, file.size);
                    break;
                default:
                    alert('非対応のファイル形式です。対応形式: GLB, GLTF, STL, OBJ, FBX');
                    hideLoading();
            }
        } catch (error) {
            console.error('モデル読み込みエラー:', error);
            alert('モデルの読み込みに失敗しました。');
            hideLoading();
        }
    };

    reader.readAsArrayBuffer(file);
}

// GLTFローダー
function loadGLTF(arrayBuffer, fileName, fileSize) {
    const loader = new GLTFLoader();
    loader.parse(arrayBuffer, '', (gltf) => {
        finalizeModel(gltf.scene, fileName, 'glb', fileSize);
    }, (error) => {
        console.error('GLTF読み込みエラー:', error);
        alert('GLTFファイルの読み込みに失敗しました。');
        hideLoading();
    });
}

// STLローダー
function loadSTL(arrayBuffer, fileName, fileSize) {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);

    // マテリアルの作成
    const material = new THREE.MeshPhongMaterial({
        color: 0x6366f1,
        specular: 0x111111,
        shininess: 200
    });

    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.add(mesh);

    finalizeModel(group, fileName, 'stl', fileSize);
}

// OBJローダー
function loadOBJ(arrayBuffer, fileName, fileSize) {
    const loader = new OBJLoader();
    const text = new TextDecoder().decode(arrayBuffer);

    const obj = loader.parse(text);

    // デフォルトマテリアルを適用
    obj.traverse((child) => {
        if (child.isMesh && !child.material) {
            child.material = new THREE.MeshPhongMaterial({
                color: 0x14b8a6,
                specular: 0x111111,
                shininess: 200
            });
        }
    });

    finalizeModel(obj, fileName, 'obj', fileSize);
}

// FBXローダー
function loadFBX(arrayBuffer, fileName, fileSize) {
    const loader = new FBXLoader();

    loader.parse(arrayBuffer, '', (fbx) => {
        finalizeModel(fbx, fileName, 'fbx', fileSize);
    }, (error) => {
        console.error('FBX読み込みエラー:', error);
        alert('FBXファイルの読み込みに失敗しました。');
        hideLoading();
    });
}

// モデルの最終処理
function finalizeModel(object3D, fileName, format, fileSize) {
    if (!object3D) return;

    // モデルのサイズを正規化
    const box = new THREE.Box3().setFromObject(object3D);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 4 / maxDim;

    object3D.scale.multiplyScalar(scale);

    // 追加モードの場合、既存モデルと重ならないように配置
    if (loadMode === 'add' && models.length > 0) {
        object3D.position.x = models.length * 5;
    } else {
        object3D.position.sub(center.multiplyScalar(scale));
    }

    // 影の設定
    object3D.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    addModel(fileName, object3D, format, fileSize);

    // ドロップゾーンを非表示
    dropZone.classList.add('hidden');
    hideLoading();
}

// ========================================
// モデル管理システム
// ========================================
function addModel(name, object3D, format, fileSize) {
    const modelData = new ModelData(name, object3D, format, fileSize);

    // オリジナルマテリアルを保存
    object3D.traverse((child) => {
        if (child.isMesh) {
            modelData.originalMaterials.set(child, child.material.clone());
        }
    });

    models.push(modelData);
    scene.add(object3D);

    updateModelList();
    selectModel(models.length - 1);
}

function removeModel(index) {
    if (index < 0 || index >= models.length) return;

    const model = models[index];
    scene.remove(model.object3D);
    models.splice(index, 1);

    if (selectedModelIndex === index) {
        selectedModelIndex = -1;
        hideTransformPanel();
    } else if (selectedModelIndex > index) {
        selectedModelIndex--;
    }

    updateModelList();
}

function clearAllModels() {
    models.forEach(model => scene.remove(model.object3D));
    models.length = 0;
    selectedModelIndex = -1;
    hideTransformPanel();
    updateModelList();
    dropZone.classList.remove('hidden');
}

function selectModel(index) {
    if (index < 0 || index >= models.length) return;

    // 前の選択を解除
    if (selectedModelIndex >= 0) {
        unhighlightModel(selectedModelIndex);
    }

    selectedModelIndex = index;
    highlightModel(index);
    showTransformPanel(models[index]);
    updateModelListUI();
}

function highlightModel(index) {
    if (index < 0 || index >= models.length) return;

    const model = models[index];

    // アウトラインエフェクトを追加
    model.object3D.traverse((child) => {
        if (child.isMesh) {
            child.userData.originalEmissive = child.material.emissive?.getHex() || 0x000000;
            child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;

            if (child.material.emissive) {
                child.material.emissive.setHex(0x6366f1);
                child.material.emissiveIntensity = 0.3;
            }
        }
    });
}

function unhighlightModel(index) {
    if (index < 0 || index >= models.length) return;

    const model = models[index];

    model.object3D.traverse((child) => {
        if (child.isMesh && child.userData.originalEmissive !== undefined) {
            if (child.material.emissive) {
                child.material.emissive.setHex(child.userData.originalEmissive);
                child.material.emissiveIntensity = child.userData.originalEmissiveIntensity || 0;
            }
        }
    });
}

function updateModelList() {
    const modelList = document.getElementById('modelList');
    if (!modelList) return;

    modelList.innerHTML = '';

    models.forEach((model, index) => {
        const li = document.createElement('li');
        li.className = 'model-list-item';
        if (index === selectedModelIndex) {
            li.classList.add('selected');
        }

        li.innerHTML = `
            <div class="model-name">${model.name}</div>
            <div class="model-info">${model.metadata.format.toUpperCase()} • ${formatFileSize(model.metadata.fileSize)}</div>
        `;

        li.addEventListener('click', () => selectModel(index));
        modelList.appendChild(li);
    });
}

function updateModelListUI() {
    const items = document.querySelectorAll('.model-list-item');
    items.forEach((item, index) => {
        if (index === selectedModelIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showTransformPanel(model) {
    if (!transformPanel) return;

    transformPanel.classList.remove('hidden');
    selectedModelName.textContent = model.name;

    // 位置を表示
    posXInput.value = model.object3D.position.x.toFixed(2);
    posYInput.value = model.object3D.position.y.toFixed(2);
    posZInput.value = model.object3D.position.z.toFixed(2);

    // スケールを表示
    scaleXInput.value = model.object3D.scale.x.toFixed(2);
    scaleYInput.value = model.object3D.scale.y.toFixed(2);
    scaleZInput.value = model.object3D.scale.z.toFixed(2);

    // 回転を表示（ラジアンから度に変換）
    rotXInput.value = Math.round(model.object3D.rotation.x * 180 / Math.PI);
    rotYInput.value = Math.round(model.object3D.rotation.y * 180 / Math.PI);
    rotZInput.value = Math.round(model.object3D.rotation.z * 180 / Math.PI);
}

function hideTransformPanel() {
    if (!transformPanel) return;
    transformPanel.classList.add('hidden');
    selectedModelIndex = -1;
    // 表示ボタンを表示
    showTransformPanelBtn.classList.remove('hidden');
}

// ========================================
// UI コントロール
// ========================================
function handleLightIntensityChange(event) {
    const value = event.target.value;
    const intensity = value / 100;

    directionalLight.intensity = intensity;
    pointLight1.intensity = intensity * 0.5;
    pointLight2.intensity = intensity * 0.5;

    lightValue.textContent = `${value}%`;
}

function handleBgColorChange(event) {
    const color = event.target.value;
    scene.background = new THREE.Color(color);
}

function handleWireframeToggle(event) {
    const isWireframe = event.target.checked;

    // すべてのモデルに対してワイヤーフレーム表示を切り替え
    models.forEach(modelData => {
        modelData.object3D.traverse((child) => {
            if (child.isMesh) {
                if (isWireframe) {
                    // ワイヤーフレームモードに切り替え
                    child.material = new THREE.MeshBasicMaterial({
                        color: 0x6366f1,
                        wireframe: true
                    });
                } else {
                    // オリジナルマテリアルに戻す
                    const original = modelData.originalMaterials.get(child);
                    if (original) {
                        child.material = original.clone();
                    }
                }
            }
        });
    });
}

function resetView() {
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.reset();
}

// ========================================
// 平面ビューリセット
// ========================================
function setViewXY() {
    // XY平面（上から見下ろす）
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

function setViewYZ() {
    // YZ平面（X軸方向から）
    camera.position.set(10, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

function setViewZX() {
    // ZX平面（Y軸方向から）
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

// ========================================
// 読み込みモード変更
// ========================================
function handleLoadModeChange(event) {
    loadMode = event.target.value;
}

// ========================================
// トランスフォーム操作
// ========================================
function handlePositionChange() {
    if (selectedModelIndex < 0 || selectedModelIndex >= models.length) return;

    const x = parseFloat(posXInput.value) || 0;
    const y = parseFloat(posYInput.value) || 0;
    const z = parseFloat(posZInput.value) || 0;

    models[selectedModelIndex].object3D.position.set(x, y, z);
}

function handleScaleChange(event) {
    if (selectedModelIndex < 0 || selectedModelIndex >= models.length) return;

    if (uniformScaleCheckbox.checked) {
        // 均等スケール
        const value = parseFloat(event.target.value) || 1;
        scaleXInput.value = value;
        scaleYInput.value = value;
        scaleZInput.value = value;
        models[selectedModelIndex].object3D.scale.set(value, value, value);
    } else {
        // 個別スケール
        const x = parseFloat(scaleXInput.value) || 1;
        const y = parseFloat(scaleYInput.value) || 1;
        const z = parseFloat(scaleZInput.value) || 1;
        models[selectedModelIndex].object3D.scale.set(x, y, z);
    }
}

function handleUniformScaleChange() {
    if (uniformScaleCheckbox.checked && selectedModelIndex >= 0) {
        // 均等スケールに切り替え時、X値を基準に統一
        const value = parseFloat(scaleXInput.value) || 1;
        scaleYInput.value = value;
        scaleZInput.value = value;
        models[selectedModelIndex].object3D.scale.set(value, value, value);
    }
}

// ========================================
// モデル管理ハンドラー
// ========================================
function handleLoadModel() {
    // ファイル選択ダイアログを開く
    fileInput.click();
}

function handleDeleteModel() {
    if (selectedModelIndex < 0 || selectedModelIndex >= models.length) return;

    if (confirm(`「${models[selectedModelIndex].name}」を削除しますか?`)) {
        removeModel(selectedModelIndex);
    }
}

function handleDuplicateModel() {
    if (selectedModelIndex < 0 || selectedModelIndex >= models.length) return;

    const original = models[selectedModelIndex];
    const cloned = original.object3D.clone();

    // 少しずらして配置
    cloned.position.x += 2;

    // オリジナルマテリアルをコピー
    cloned.traverse((child) => {
        if (child.isMesh) {
            const originalChild = original.object3D.getObjectByProperty('uuid', child.uuid.replace(/-clone$/, ''));
            if (originalChild && originalChild.material) {
                child.material = originalChild.material.clone();
            }
        }
    });

    addModel(
        original.name + ' (コピー)',
        cloned,
        original.metadata.format,
        original.metadata.fileSize
    );
}

function handleClearAll() {
    if (models.length === 0) return;

    if (confirm(`すべてのモデル（${models.length}個）をクリアしますか?`)) {
        clearAllModels();
    }
}

// ========================================
// 回転操作
// ========================================
function handleRotationChange() {
    if (selectedModelIndex < 0 || selectedModelIndex >= models.length) return;

    // 度数からラジアンに変換
    const x = (parseFloat(rotXInput.value) || 0) * Math.PI / 180;
    const y = (parseFloat(rotYInput.value) || 0) * Math.PI / 180;
    const z = (parseFloat(rotZInput.value) || 0) * Math.PI / 180;

    models[selectedModelIndex].object3D.rotation.set(x, y, z);
}

// ========================================
// 光源調整
// ========================================
function toggleLightPanel() {
    if (!lightPanel) return;
    lightPanel.classList.toggle('hidden');
}

function handleLightPositionChange() {
    const x = parseFloat(lightPosXInput.value) || 5;
    const y = parseFloat(lightPosYInput.value) || 10;
    const z = parseFloat(lightPosZInput.value) || 5;

    directionalLight.position.set(x, y, z);
}

function handleLightColorChange() {
    const color = lightColorInput.value;
    directionalLight.color.set(color);
}

// ========================================
// ユーティリティ
// ========================================
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ========================================
// 座標軸ビューアー
// ========================================
function setupAxesViewer() {
    // 座標軸用のシーン
    axesScene = new THREE.Scene();

    // 座標軸用のカメラ（正投影）
    axesCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
    axesCamera.position.set(0, 0, 5);

    // 座標軸ヘルパー
    const axesHelper = new THREE.AxesHelper(1.5);
    axesScene.add(axesHelper);

    // XYZラベルを追加
    const createTextSprite = (text, color, position) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;

        context.fillStyle = color;
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(0.5, 0.5, 1);

        return sprite;
    };

    // X軸ラベル（赤）
    axesScene.add(createTextSprite('X', '#ff0000', new THREE.Vector3(2, 0, 0)));
    // Y軸ラベル（緑）
    axesScene.add(createTextSprite('Y', '#00ff00', new THREE.Vector3(0, 2, 0)));
    // Z軸ラベル（青）
    axesScene.add(createTextSprite('Z', '#0000ff', new THREE.Vector3(0, 0, 2)));
}

// ========================================
// アニメーションループ
// ========================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // 手動でクリア（autoClear = falseのため）
    renderer.clear();

    // メインシーンのレンダリング
    renderer.render(scene, camera);

    // 座標軸ビューアーのレンダリング（右上）
    if (axesScene && axesCamera) {
        // 座標軸カメラをメインカメラと同じ向きに
        axesCamera.position.copy(camera.position);
        axesCamera.position.sub(controls.target);
        axesCamera.position.setLength(5);
        axesCamera.lookAt(axesScene.position);

        // ビューポートを左上に設定（150x150ピクセル）
        const size = 150;
        const margin = 10;
        renderer.setViewport(
            margin,  // 左側
            window.innerHeight - size - margin,  // 上側
            size,
            size
        );
        renderer.setScissor(
            margin,  // 左側
            window.innerHeight - size - margin,  // 上側
            size,
            size
        );
        renderer.setScissorTest(true);
        renderer.render(axesScene, axesCamera);

        // ビューポートをリセット
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissorTest(false);
    }
}

// ========================================
// ドラッグ可能なパネル
// ========================================
class DraggablePanel {
    constructor(panelElement, storageKey) {
        this.panel = panelElement;
        this.storageKey = storageKey;
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;

        this.init();
    }

    init() {
        const header = this.panel.querySelector('.panel-header');
        if (!header) return;

        // パネル全体でドラッグ可能に（ヘッダーだけでなく）
        this.panel.addEventListener('mousedown', this.dragStart.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.dragEnd.bind(this));

        // 保存された位置を復元
        this.restorePosition();
    }

    dragStart(e) {
        // 閉じるボタン、入力フィールド、ボタンをクリックした場合はドラッグしない
        if (e.target.classList.contains('panel-close-btn') ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'LABEL') {
            return;
        }

        this.initialX = e.clientX - this.xOffset;
        this.initialY = e.clientY - this.yOffset;
        this.isDragging = true;
        this.panel.classList.add('dragging');
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        this.currentX = e.clientX - this.initialX;
        this.currentY = e.clientY - this.initialY;

        // 画面外に出ないように制限
        const rect = this.panel.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        this.currentX = Math.max(0, Math.min(this.currentX, maxX));
        this.currentY = Math.max(0, Math.min(this.currentY, maxY));

        this.xOffset = this.currentX;
        this.yOffset = this.currentY;

        this.setTranslate(this.currentX, this.currentY);
    }

    dragEnd() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.panel.classList.remove('dragging');

        // 位置を保存
        this.savePosition();
    }

    setTranslate(xPos, yPos) {
        this.panel.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    savePosition() {
        localStorage.setItem(this.storageKey, JSON.stringify({
            x: this.xOffset,
            y: this.yOffset
        }));
    }

    restorePosition() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const { x, y } = JSON.parse(saved);
                this.xOffset = x;
                this.yOffset = y;
                this.setTranslate(x, y);
            } catch (e) {
                console.error('Failed to restore panel position:', e);
            }
        }
    }
}

// パネルのドラッグ機能を初期化
let transformPanelDraggable, lightPanelDraggable;

function initDraggablePanels() {
    transformPanelDraggable = new DraggablePanel(
        transformPanel,
        'transformPanelPosition'
    );

    lightPanelDraggable = new DraggablePanel(
        lightPanel,
        'lightPanelPosition'
    );
}

// 初期化時にドラッグ機能を有効化
window.addEventListener('DOMContentLoaded', () => {
    initDraggablePanels();
});

// ========================================
// アプリケーション起動
// ========================================
init();
