// Import services and utils
import * as gemini from './services/geminiService.js';
import { optimizeImage } from './utils/imageOptimizer.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('capture-canvas');
    const uploadInput = document.getElementById('upload-input');
    const toastContainer = document.getElementById('toastContainer');
    
    // API Key Modal Elements
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

    // Pages
    const mainPage = document.getElementById('mainPage');
    const detailPage = document.getElementById('detailPage');
    const archivePage = document.getElementById('archivePage');

    // Main Page Elements
    const cameraStartOverlay = document.getElementById('cameraStartOverlay');
    const mainLoader = document.getElementById('mainLoader');
    const mainFooter = mainPage.querySelector('.footer-safe-area');
    const shootBtn = document.getElementById('shootBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const micBtn = document.getElementById('micBtn');
    const archiveBtn = document.getElementById('archiveBtn');

    // Detail Page Elements
    const backBtn = document.getElementById('backBtn');
    const resultImage = document.getElementById('resultImage');
    const loader = document.getElementById('loader');
    const textOverlay = document.getElementById('textOverlay');
    const descriptionText = document.getElementById('descriptionText');
    const loadingHeader = document.getElementById('loadingHeader');
    const loadingHeaderText = loadingHeader.querySelector('h1');
    const loadingText = document.getElementById('loadingText');
    const detailFooter = document.getElementById('detailFooter');
    const audioBtn = document.getElementById('audioBtn');
    const textToggleBtn = document.getElementById('textToggleBtn');
    const saveBtn = document.getElementById('saveBtn');

    // Archive Page Elements
    const archiveBackBtn = document.getElementById('archiveBackBtn');
    const archiveGrid = document.getElementById('archiveGrid');
    const emptyArchiveMessage = document.getElementById('emptyArchiveMessage');
    const archiveHeader = document.getElementById('archiveHeader');
    const selectionHeader = document.getElementById('selectionHeader');
    const selectArchiveBtn = document.getElementById('selectArchiveBtn');
    const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
    const selectionCount = document.getElementById('selectionCount');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

    // Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = SpeechRecognition ? new SpeechRecognition() : null;
    let isRecognizing = false;

    let stream = null;
    let isCameraActive = false; // To prevent camera re-initialization
    
    // TTS State
    const synth = window.speechSynthesis;
    let utteranceQueue = [];
    let isSpeaking = false;
    let isPaused = false;
    let currentlySpeakingElement = null;

    // App State
    const STORAGE_KEY = 'travel_assistant_archive';
    let currentContent = { imageDataUrl: null, description: '' };
    let isSelectionMode = false;
    let selectedItemIds = new Set();
    
    // --- UI Helpers ---
    function showToast(message, duration = 3000) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }

    // --- Page Control ---
    function showPage(pageToShow) {
        [mainPage, detailPage, archivePage].forEach(page => {
            if (page) page.classList.toggle('visible', page === pageToShow);
        });
    }
    
    async function showMainPage() {
        synth.cancel();
        resetSpeechState();
        showPage(mainPage);

        detailPage.classList.remove('bg-friendly');
        cameraStartOverlay.classList.add('hidden');

        mainLoader.classList.remove('hidden');
        mainFooter.classList.add('hidden');

        try {
            if (!isCameraActive && gemini.isInitialized()) {
                await startCamera();
            }
        } catch (error) {
            console.error("카메라를 다시 시작하지 못했습니다.", error);
            showToast("카메라를 시작하지 못했습니다. 앱을 새로고침 해주세요.");
        } finally {
            mainLoader.classList.add('hidden');
            mainFooter.classList.remove('hidden');
        }
    }

    function showDetailPage(isFromArchive = false) {
        stopCamera();
        showPage(detailPage);
        saveBtn.disabled = isFromArchive;
        if (isFromArchive) {
            const savedIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>`;
            saveBtn.innerHTML = savedIcon;
        } else {
             const notSavedIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>`;
             saveBtn.innerHTML = notSavedIcon;
        }
    }

    function showArchivePage() {
        stopCamera();
        if (isSelectionMode) { // Exit selection mode if active
            toggleSelectionMode(false); // Explicitly exit
        }
        renderArchive();
        showPage(archivePage);
    }
    
    function resetSpeechState() {
        utteranceQueue = [];
        isSpeaking = false;
        isPaused = false;
        if (currentlySpeakingElement) {
            currentlySpeakingElement.classList.remove('speaking');
        }
        currentlySpeakingElement = null;
    }

    // --- App Initialization ---AIzaSyCc1AqK3B-ttoDEhORCcwUQWfqTCU2olr4
    function initializeApp() {
        // --- 시작: API 키를 여기에 직접 입력해주세요! ---
        // 아래 "여기에_친구의_Gemini_API_키를_붙여넣으세요" 부분에
        // 실제 API 키를 복사해서 붙여넣으면, 시작 시 API 키 입력창이 나타나지 않습니다.
        const apiKey = "AIzaSyCc1AqK3B-ttoDEhORCcwUQWfqTCU2olr4";
        gemini.init(apiKey);
        // --- 끝: API 키 입력 부분 ---

        /* --- 시작: 기존 코드는 나중에 다시 사용하기 위해 잠시 보관(주석 처리)합니다 ---
        const apiKey = sessionStorage.getItem('GEMINI_API_KEY');
        if (apiKey) {
            gemini.init(apiKey);
        } else {
            apiKeyModal.classList.remove('hidden');
        }
        --- 끝: 기존 코드 보관 --- */

        showPage(mainPage);
        if (recognition) {
            recognition.continuous = false;
            recognition.lang = 'ko-KR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
        }
    }

    async function handleStartCameraClick() {
        if (!gemini.isInitialized()) {
            showToast("API 키를 먼저 설정해주세요.");
            apiKeyModal.classList.remove('hidden');
            return;
        }

        if (synth && !synth.speaking) {
            const unlockUtterance = new SpeechSynthesisUtterance('');
            synth.speak(unlockUtterance);
            synth.cancel();
        }

        cameraStartOverlay.removeEventListener('click', handleStartCameraClick);

        cameraStartOverlay.querySelector('h1').classList.add('hidden');
        cameraStartOverlay.querySelector('p').classList.add('hidden');
        mainLoader.classList.remove('hidden');

        try {
            await startCamera();
            cameraStartOverlay.classList.add('hidden');
        } catch (error) {
            console.error(`Initialization error: ${error.message}`);
            cameraStartOverlay.querySelector('h1').classList.remove('hidden');
            const p = cameraStartOverlay.querySelector('p');
            p.classList.remove('hidden');
            if (p) p.innerHTML = "카메라 시작 실패.<br>다시 터치해주세요.";
            cameraStartOverlay.addEventListener('click', handleStartCameraClick);
        } finally {
            mainLoader.classList.add('hidden');
        }
    }

    function startCamera() {
        return new Promise(async (resolve, reject) => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const err = new Error("카메라 기능을 지원하지 않는 브라우저입니다.");
                console.error("Camera unsupported:", err);
                shootBtn.disabled = true;
                uploadBtn.disabled = true;
                micBtn.disabled = true;
                return reject(err);
            }

            const preferredConstraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
            const fallbackConstraints = { video: true, audio: false };
            let cameraStream;

            try {
                cameraStream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
            } catch (err) {
                console.warn("Could not get camera with ideal constraints, falling back to basic.", err);
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                } catch (fallbackErr) {
                    console.error("Camera access denied for all constraints:", fallbackErr);
                    shootBtn.disabled = true;
                    uploadBtn.disabled = true;
                    micBtn.disabled = true;
                    return reject(fallbackErr);
                }
            }
            
            stream = cameraStream;
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                shootBtn.disabled = false;
                uploadBtn.disabled = false;
                micBtn.disabled = false;
                isCameraActive = true;
                resolve();
            };
            video.onerror = (err) => {
                console.error("Video element error:", err);
                reject(new Error("Failed to load video stream."));
            };
        });
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            video.srcObject = null;
            isCameraActive = false;
        }
    }

    function capturePhoto() {
        if (!video.videoWidth || !video.videoHeight) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            processImage(canvas.toDataURL('image/jpeg'));
        }
    }
    
    function handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => processImage(e.target?.result);
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    }

    async function processImage(dataUrl) {
        if (synth.speaking || synth.pending) synth.cancel();
        resetSpeechState();

        showDetailPage();
        
        currentContent = { imageDataUrl: dataUrl, description: '' };
        
        resultImage.src = dataUrl;
        resultImage.classList.remove('hidden');
        loader.classList.remove('hidden');
        textOverlay.classList.add('hidden');
        textOverlay.classList.remove('animate-in');
        loadingHeader.classList.remove('hidden');
        loadingHeaderText.textContent = '해설 준비 중...';
        detailFooter.classList.add('hidden');
        descriptionText.innerHTML = '';
        updateAudioButton('loading');

        const loadingMessages = ["사진 속 이야기를 찾아내고 있어요...", "곧 재미있는 이야기를 들려드릴게요!"];
        let msgIndex = 0;
        loadingText.innerText = loadingMessages[msgIndex];
        const loadingInterval = window.setInterval(() => {
            msgIndex = (msgIndex + 1) % loadingMessages.length;
            loadingText.innerText = loadingMessages[msgIndex];
        }, 2000);

        try {
            if (!gemini.isInitialized()) {
                apiKeyModal.classList.remove('hidden');
                showToast("API 키를 먼저 설정해주세요.");
                showMainPage();
                clearInterval(loadingInterval);
                return;
            }

            const optimizedDataUrl = await optimizeImage(dataUrl);
            const base64Image = optimizedDataUrl.split(',')[1];
            currentContent.imageDataUrl = optimizedDataUrl;

            const responseStream = await gemini.generateDescriptionStream(base64Image);
            
            clearInterval(loadingInterval);
            loader.classList.add('hidden');
            textOverlay.classList.remove('hidden');
            textOverlay.classList.add('animate-in');
            loadingHeader.classList.add('hidden');
            detailFooter.classList.remove('hidden');

            let sentenceBuffer = '';
            for await (const chunk of responseStream) {
                const chunkText = chunk.text;
                if (chunkText) {
                    currentContent.description += chunkText;
                    sentenceBuffer += chunkText;

                    const sentenceEndings = /[.?!]/g;
                    let match;
                    while ((match = sentenceEndings.exec(sentenceBuffer)) !== null) {
                        const sentence = sentenceBuffer.substring(0, match.index + 1).trim();
                        sentenceBuffer = sentenceBuffer.substring(match.index + 1);
                        if (sentence) {
                            const span = document.createElement('span');
                            span.textContent = sentence + ' ';
                            descriptionText.appendChild(span);
                            queueForSpeech(sentence, span);
                        }
                    }
                }
            }
            
            if (sentenceBuffer.trim()) {
                const sentence = sentenceBuffer.trim();
                const span = document.createElement('span');
                span.textContent = sentence + ' ';
                descriptionText.appendChild(span);
                queueForSpeech(sentence, span);
            }

        } catch (err) {
            console.error("분석 오류:", err);
            clearInterval(loadingInterval);
            loader.classList.add('hidden');
            loadingHeader.classList.add('hidden');
            textOverlay.classList.remove('hidden');
            let errorMessage = "이미지 해설 중 오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.";
            if (err.message && err.message.includes("API key not valid")) {
                errorMessage = "API 키가 올바르지 않습니다. 확인 후 다시 입력해주세요.";
                sessionStorage.removeItem('GEMINI_API_KEY');
                gemini.init(null); // 서비스 초기화 해제
                apiKeyModal.classList.remove('hidden');
            }
            descriptionText.innerText = errorMessage;
            updateAudioButton('disabled');
        }
    }
    
    function handleMicButtonClick() {
        if (!recognition) {
            showToast("음성 인식이 지원되지 않는 브라우저입니다.");
            return;
        }

        if (isRecognizing) {
            return;
        }
        
        showToast('마이크에 대고 말씀해주세요...');
        isRecognizing = true;
        micBtn.classList.add('mic-listening');
        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            processTextQuery(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                showToast('음성을 인식하지 못했습니다. 주변 소음을 줄이고 다시 시도해주세요.');
            } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                showToast('마이크 사용 권한이 필요합니다.');
            } else {
                showToast('음성 인식 중 오류가 발생했습니다.');
            }
        };
        
        recognition.onend = () => {
            micBtn.classList.remove('mic-listening');
            isRecognizing = false;
        };
    }
    
    async function processTextQuery(prompt) {
        if (synth.speaking || synth.pending) synth.cancel();
        resetSpeechState();
        
        showDetailPage();
        
        detailPage.classList.add('bg-friendly');
        saveBtn.disabled = true;

        currentContent = { imageDataUrl: null, description: '' };

        resultImage.src = '';
        resultImage.classList.add('hidden');
        loader.classList.remove('hidden');
        textOverlay.classList.add('hidden');
        textOverlay.classList.remove('animate-in');
        loadingHeader.classList.remove('hidden');
        loadingHeaderText.textContent = '답변 준비 중...';
        detailFooter.classList.add('hidden');
        descriptionText.innerHTML = '';
        updateAudioButton('loading');

        const loadingMessages = ["어떤 질문인지 살펴보고 있어요...", "친절한 답변을 준비하고 있어요!"];
        let msgIndex = 0;
        loadingText.innerText = loadingMessages[msgIndex];
        const loadingInterval = window.setInterval(() => {
            msgIndex = (msgIndex + 1) % loadingMessages.length;
            loadingText.innerText = loadingMessages[msgIndex];
        }, 2000);

        try {
            if (!gemini.isInitialized()) {
                apiKeyModal.classList.remove('hidden');
                showToast("API 키를 먼저 설정해주세요.");
                showMainPage();
                clearInterval(loadingInterval);
                return;
            }

            const responseStream = await gemini.generateTextStream(prompt);
            
            clearInterval(loadingInterval);
            loader.classList.add('hidden');
            textOverlay.classList.remove('hidden');
            textOverlay.classList.add('animate-in');
            loadingHeader.classList.add('hidden');
            detailFooter.classList.remove('hidden');

            let sentenceBuffer = '';
            for await (const chunk of responseStream) {
                const chunkText = chunk.text;
                if(chunkText) {
                    currentContent.description += chunkText;
                    sentenceBuffer += chunkText;

                    const sentenceEndings = /[.?!]/g;
                    let match;
                    while ((match = sentenceEndings.exec(sentenceBuffer)) !== null) {
                        const sentence = sentenceBuffer.substring(0, match.index + 1).trim();
                        sentenceBuffer = sentenceBuffer.substring(match.index + 1);
                        if (sentence) {
                            const span = document.createElement('span');
                            span.textContent = sentence + ' ';
                            descriptionText.appendChild(span);
                            queueForSpeech(sentence, span);
                        }
                    }
                }
            }

            if (sentenceBuffer.trim()) {
                const sentence = sentenceBuffer.trim();
                const span = document.createElement('span');
                span.textContent = sentence + ' ';
                descriptionText.appendChild(span);
                queueForSpeech(sentence, span);
            }
            
        } catch (err) {
            console.error("답변 오류:", err);
            clearInterval(loadingInterval);
            loader.classList.add('hidden');
            loadingHeader.classList.add('hidden');
            textOverlay.classList.remove('hidden');
            let errorMessage = "답변 생성 중 오류가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.";
            if (err.message && err.message.includes("API key not valid")) {
                errorMessage = "API 키가 올바르지 않습니다. 확인 후 다시 입력해주세요.";
                sessionStorage.removeItem('GEMINI_API_KEY');
                gemini.init(null); // 서비스 초기화 해제
                apiKeyModal.classList.remove('hidden');
            }
            descriptionText.innerText = errorMessage;
            updateAudioButton('disabled');
        }
    }

    function getArchive() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return [];
        }
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse archive data from localStorage. Data might be corrupted.", e);
            return [];
        }
    }

    function saveToArchive(items) {
        try {
            const dataToSave = JSON.stringify(items);
            localStorage.setItem(STORAGE_KEY, dataToSave);
            return true; // Indicate success
        } catch (e) {
            console.error("Failed to save to archive:", e);
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                showToast("저장 공간이 부족하여 작업을 완료할 수 없습니다.");
            } else {
                showToast("알 수 없는 오류로 저장/삭제에 실패했습니다.");
            }
            return false; // Indicate failure
        }
    }

    function handleSaveClick() {
        if (!currentContent.description || !currentContent.imageDataUrl) return;

        const archive = getArchive();
        const newItem = {
            id: Date.now(),
            ...currentContent
        };
        archive.unshift(newItem);
        
        const success = saveToArchive(archive);

        if (success) {
            showToast("보관함에 저장되었습니다.");
            saveBtn.disabled = true;
            const savedIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>`;
            saveBtn.innerHTML = savedIcon;
        }
    }
    
    function toggleSelectionMode(forceState) {
        const previousState = isSelectionMode;
        isSelectionMode = (typeof forceState === 'boolean') ? forceState : !isSelectionMode;

        archiveHeader.classList.toggle('hidden', isSelectionMode);
        selectionHeader.classList.toggle('hidden', !isSelectionMode);

        if (isSelectionMode) {
            // Entering selection mode
            selectedItemIds.clear(); // Always start fresh
            updateSelectionHeader();
            renderArchive(); // Re-render to show selectable items
        } else if (previousState) {
            // Exiting selection mode (only if it was previously active)
            selectedItemIds.clear();
            renderArchive(); // Re-render to hide selectable items
        }
    }
    
    function updateSelectionHeader() {
        const count = selectedItemIds.size;
        selectionCount.textContent = `${count}개 선택`;
        deleteSelectedBtn.disabled = count === 0;
    }

    function handleDeleteSelected() {
        const count = selectedItemIds.size;
        if (count === 0) return;
    
        const message = count === 1 ? '1개의 항목을 삭제하시겠습니까?' : `${count}개의 항목을 삭제하시겠습니까?`;
        
        if (confirm(message)) {
            let archive = getArchive();
            const updatedArchive = archive.filter(item => !selectedItemIds.has(Number(item.id)));
            const success = saveToArchive(updatedArchive);
    
            if (success) {
                showToast(`${count}개 항목이 삭제되었습니다.`);
                // Manually exit selection mode and re-render for robustness.
                isSelectionMode = false;
                selectedItemIds.clear();
                archiveHeader.classList.remove('hidden');
                selectionHeader.classList.add('hidden');
                renderArchive(); // Re-render the grid with the latest data from storage.
            } else {
                showToast('삭제 중 오류가 발생했습니다.');
            }
        }
    }

    function renderArchive(itemsToRender) {
        const archive = itemsToRender || getArchive();
        archiveGrid.innerHTML = '';
    
        const hasItems = archive.length > 0;
        emptyArchiveMessage.classList.toggle('hidden', hasItems);
        selectArchiveBtn.classList.toggle('hidden', !hasItems);
    
        if (hasItems) {
            archive.forEach(item => {
                const itemId = Number(item.id);
                const description = item.description || '';
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'archive-item';
                itemDiv.dataset.id = itemId.toString();
    
                if (isSelectionMode) {
                    itemDiv.classList.add('selectable');
                    if (selectedItemIds.has(itemId)) {
                        itemDiv.classList.add('selected');
                    }
                }
    
                itemDiv.setAttribute('role', 'button');
                itemDiv.setAttribute('tabindex', '0');
                itemDiv.setAttribute('aria-label', `보관된 항목: ${description.substring(0, 30)}...`);
                
                if (isSelectionMode) {
                    const checkbox = document.createElement('div');
                    checkbox.className = 'selection-checkbox';
                    checkbox.innerHTML = `
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>
                    `;
                    itemDiv.appendChild(checkbox);
                }
    
                const img = document.createElement('img');
                img.src = item.imageDataUrl || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                img.alt = description.substring(0, 30);
                img.loading = 'lazy';
                
                itemDiv.appendChild(img);
                archiveGrid.appendChild(itemDiv);
            });
        }
    }
    

    function populateDetailPageFromArchive(item) {
        resetSpeechState();
        
        resultImage.src = item.imageDataUrl || '';
        resultImage.classList.toggle('hidden', !item.imageDataUrl);

        detailPage.classList.remove('bg-friendly');

        descriptionText.innerHTML = '';
        
        loader.classList.add('hidden');
        textOverlay.classList.remove('hidden');
        textOverlay.classList.remove('animate-in');
        loadingHeader.classList.add('hidden');
        detailFooter.classList.remove('hidden');
        
        const description = item.description || '';
        
        const sentences = description.match(/[^.?!]+[.?!]+/g) || [description];
        sentences.forEach(sentence => {
            if (!sentence) return;
            const span = document.createElement('span');
            span.textContent = sentence.trim() + ' ';
            descriptionText.appendChild(span);
            queueForSpeech(sentence.trim(), span);
        });

        updateAudioButton('play');
        showDetailPage(true);
    }

    function playNextInQueue() {
        if (isPaused || utteranceQueue.length === 0) {
            if (utteranceQueue.length === 0) {
                isSpeaking = false;
                isPaused = false;
                if(currentlySpeakingElement) currentlySpeakingElement.classList.remove('speaking');
                currentlySpeakingElement = null;
                updateAudioButton('play');
            }
            return;
        }
        
        isSpeaking = true;
        const { utterance, element } = utteranceQueue[0];
        
        if (currentlySpeakingElement) {
            currentlySpeakingElement.classList.remove('speaking');
        }
        element.classList.add('speaking');
        currentlySpeakingElement = element;
        
        utterance.onend = () => {
            utteranceQueue.shift();
            playNextInQueue();
        };

        synth.speak(utterance);
    }

    function queueForSpeech(text, element) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utteranceQueue.push({ utterance, element });

        if (!isSpeaking && !synth.speaking && !isPaused) {
            updateAudioButton('pause');
            playNextInQueue();
        }
    }

    function handleAudioButtonClick() {
        if (!isSpeaking && utteranceQueue.length > 0) {
            isPaused = false;
            if (synth.paused) {
                synth.resume();
            } else {
                playNextInQueue();
            }
            updateAudioButton('pause');
        } else if (isSpeaking && !isPaused) {
            isPaused = true;
            synth.pause();
            updateAudioButton('resume');
        } else if (isSpeaking && isPaused) {
            isPaused = false;
            synth.resume();
            updateAudioButton('pause');
        }
    }
    
    function updateAudioButton(state) {
        const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        const loadingIcon = `<div class="w-8 h-8 rounded-full animate-spin loader-blue"></div>`;

        audioBtn.disabled = state === 'loading' || state === 'disabled';
        
        switch (state) {
            case 'play':
            case 'resume':
                audioBtn.innerHTML = playIcon;
                audioBtn.setAttribute('aria-label', '오디오 재생');
                break;
            case 'pause':
                audioBtn.innerHTML = pauseIcon;
                audioBtn.setAttribute('aria-label', '오디오 일시정지');
                break;
            case 'loading':
                audioBtn.innerHTML = loadingIcon;
                 audioBtn.setAttribute('aria-label', '오디오 로딩 중');
                break;
            case 'disabled':
                 audioBtn.innerHTML = playIcon;
                 audioBtn.setAttribute('aria-label', '오디오 재생 불가');
                break;
        }
    }

    function handleArchiveGridClick(event) {
        const itemDiv = event.target.closest('.archive-item');
        if (!itemDiv) return;
    
        const itemIdString = itemDiv.dataset.id;
        const itemId = Number(itemIdString);
        
        if (isNaN(itemId)) {
            console.warn('Invalid item ID:', itemIdString);
            return;
        }
    
        if (isSelectionMode) {
            event.preventDefault();
            
            if (selectedItemIds.has(itemId)) {
                selectedItemIds.delete(itemId);
                itemDiv.classList.remove('selected');
            } else {
                selectedItemIds.add(itemId);
                itemDiv.classList.add('selected');
            }
            updateSelectionHeader();
        } else {
            const archive = getArchive();
            const item = archive.find(i => Number(i.id) === itemId);
            if (item) {
                populateDetailPageFromArchive(item);
            }
        }
    }

    function handleArchiveGridKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            const itemDiv = document.activeElement;
            if (!isSelectionMode && itemDiv.classList.contains('archive-item') && archiveGrid.contains(itemDiv)) {
                event.preventDefault(); 
                const itemId = Number(itemDiv.dataset.id);
                if (isNaN(itemId)) return;

                const archive = getArchive();
                const item = archive.find(i => Number(i.id) === itemId);
                if (item) {
                    populateDetailPageFromArchive(item);
                }
            }
        }
    }
    
    // --- Event Listeners ---
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', () => {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                sessionStorage.setItem('GEMINI_API_KEY', apiKey);
                gemini.init(apiKey);
                apiKeyModal.classList.add('hidden');
                showToast("API 키가 저장되었습니다.");
            } else {
                showToast("API 키를 입력해주세요.");
            }
        });
    }

    if (cameraStartOverlay) cameraStartOverlay.addEventListener('click', handleStartCameraClick);
    if (shootBtn) shootBtn.addEventListener('click', capturePhoto);
    if (uploadBtn) uploadBtn.addEventListener('click', () => uploadInput.click());
    if (micBtn) micBtn.addEventListener('click', handleMicButtonClick);
    if (archiveBtn) archiveBtn.addEventListener('click', showArchivePage);
    if (uploadInput) uploadInput.addEventListener('change', handleFileSelect);
    
    if (backBtn) backBtn.addEventListener('click', showMainPage);
    if (archiveBackBtn) archiveBackBtn.addEventListener('click', showMainPage);
    
    if (audioBtn) audioBtn.addEventListener('click', handleAudioButtonClick);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveClick);
    if (textToggleBtn) textToggleBtn.addEventListener('click', () => {
        const isHidden = textOverlay.classList.toggle('hidden');
        textToggleBtn.setAttribute('aria-label', isHidden ? '해설 보기' : '해설 숨기기');
    });

    if (selectArchiveBtn) selectArchiveBtn.addEventListener('click', () => toggleSelectionMode(true));
    if (cancelSelectionBtn) cancelSelectionBtn.addEventListener('click', () => toggleSelectionMode(false));
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    
    if (archiveGrid) {
        archiveGrid.addEventListener('click', handleArchiveGridClick);
        archiveGrid.addEventListener('keydown', handleArchiveGridKeydown);
    }

    // Start the app
    initializeApp();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(registration => {
                console.log('SW registered: ', registration);
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }
});