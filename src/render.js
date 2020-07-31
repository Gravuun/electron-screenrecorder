// Grab HTML elements
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const videoSelectBtn = document.getElementById('videoSelectBtn');

// Give functionality to buttons
startBtn.onclick = e => {
    mediaRecorder.start();
    startBtn.classList.add('is-danger');
    startBtn.innerText = "Recording";
};

stopBtn.onclick = e => {
    mediaRecorder.stop();
    startBtn.classList.remove("is-danger");
    startBtn.innerText = "Start";
}

videoSelectBtn.onclick = getVideoSources;

// Electron has a built in video capturer that we can use
// The remote allows us to access things on the main process, which is needed for the electron menu class
const { desktopCapturer, remote } = require('electron');
// With remote we can build native menus in the front end code
const { Menu } = remote;

// Get the available video sources
async function getVideoSources() {
    // This is an async function and getSources returns a promise (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
    // so we need to  utilize the await keyword
    const inputSources = await desktopCapturer.getSources({
        // Type 'window' is crashing the app removing it until a fix is found
        types: [ 'screen']
    });

    const videoOptionsMenu = Menu.buildFromTemplate(
        // Using the array map method we assign each source name as a menu label
        // and add a click event handler to each of those labels that indicates selecting that source
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            };
        })
    );

    videoOptionsMenu.popup();
}

// Use the Chromium browser's built-in media recorder to capture stream
let mediaRecorder;
const recordedChunks = [];

// Upon selection change to the source to record
async function selectSource(source) {
    videoSelectBtn.innerHTML = source.name;
    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
            }
        }
    };

    // Create a stream of the passed source
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Preview the stream in the window
    videoElement.srcObject = stream;
    videoElement.play();

    // Create the Media Recorder with necessary options
    // set MIME type (https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)
    const options = {mimetype: 'video/webm; codecs=vp9'};
    mediaRecorder = new MediaRecorder(stream, options);

    // Register 2 event handlers for the media recorder
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

function handleDataAvailable(e){
    console.log('video data available');
    recordedChunks.push(e.data);
}

// Allows us to access native dialog menus so we can save video
const {dialog} = remote;

// writeFile from Node fs (file system) module
const {writeFile} = require('fs');

// Save video file on stop
async function handleStop(e) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Blob
    // Intermediary object for recordedChunks array, we are going from array -> blob -> buffer
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    // Call the native save prompt
    const {filePath} = await dialog.showSaveDialog({
        buttonLabel: "Save video",
        // Save as vid-(# of miliseconds since 1/1/1970), its ugly but guarentees unique video saves
        // if user doesn;t want to name it themselves
        defaultPath: `vid-${Date.now()}.webm`
    });

    console.log(filePath);

    // write the buffer to the desired file path
    writeFile(filePath, buffer, () => console.log("Video successfully saved!"));

}