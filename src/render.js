// Grab HTML elements
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const videoSelectBtn = document.getElementById('videoSelectBtn');
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
}