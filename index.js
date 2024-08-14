import AgoraRTC from "agora-rtc-sdk-ng";
import axios from "axios";

console.log("ENVS", process.env, process.env.AGORA_APP_ID, process.env.API_URL);

let rtc = {
    localAudioTrack: null,
    localVideoTrack: null,
    client: null,
};

let options = {
    appId: process.env.AGORA_APP_ID,
    channel: "primaryChannel",
    token: null,
    uid: null,
};

// Retrieve the token from backend
function fetchToken() {
  return new Promise(function (resolve) {
      axios.get(`${process.env.API_URL}/rtcToken?channelName=${options.channel}`)
          .then(function (response) {
              console.log("AQUI LA RESPUESTA",response);
              options.token = response.data.token;
              options.uid = response.data.uid;
              resolve(options.token);
          })
          .catch(function (error) {
              console.log(error);
          });
  })
}

async function startBasicCall() {
    // Create an AgoraRTCClient object.
    rtc.client = AgoraRTC.createClient({mode: "rtc", codec: "vp8"});

    // Listen for the "user-published" event, from which you can get an AgoraRTCRemoteUser object.
    rtc.client.on("user-published", async (user, mediaType) => {
        // Subscribe to the remote user when the SDK triggers the "user-published" event
        await rtc.client.subscribe(user, mediaType);
        console.log("subscribe success");

        // If the remote user publishes a video track.
        if (mediaType === "video") {
            // Get the RemoteVideoTrack object in the AgoraRTCRemoteUser object.
            const remoteVideoTrack = user.videoTrack;
            // Dynamically create a container in the form of a DIV element for playing the remote video track.
            const remotePlayerContainer = document.createElement("div");
            // Specify the ID of the DIV container. You can use the uid of the remote user.
            remotePlayerContainer.id = user.uid.toString();
            remotePlayerContainer.textContent = "Remote user " + user.uid.toString();
            remotePlayerContainer.style.width = "640px";
            remotePlayerContainer.style.height = "480px";
            document.body.append(remotePlayerContainer);

            // Play the remote video track.
            // Pass a DIV container and the SDK dynamically creates a player in the container for playing the remote video track.
            remoteVideoTrack.play(remotePlayerContainer);
        }

        // If the remote user publishes an audio track.
        if (mediaType === "audio") {
            // Get the RemoteAudioTrack object in the AgoraRTCRemoteUser object.
            const remoteAudioTrack = user.audioTrack;
            // Play the remote audio track. No need to pass any DOM element.
            remoteAudioTrack.play();
        }

        // Listen for the "user-unpublished" event
        rtc.client.on("user-unpublished", user => {
            // Get the dynamically created DIV container.
            const remotePlayerContainer = document.getElementById(user.uid);
            // Destroy the container.
            remotePlayerContainer.remove();
        });
    });

    rtc.client.on("token-privilege-will-expire", async function () {
        // When you receive the token-privilege-will-expire callback, request a fresh token from the server 
        let token = await fetchToken();
        // Call renewToken to pass the new token to the SDK
        await rtc.client.renewToken(token);
    });

    // The token expired. 
    rtc.client.on("token-privilege-did-expire", async function () {
        console.log("Fetching a new token")
        // Request a new token from the server 
        await fetchToken();
        console.log("Rejoining the channel with new token")
        // Call join to rejoin the channel
        await rtc.client.join(options.appId, options.channel, options.token, options.uid);
    });

    window.onload = function () {
        document.getElementById("join").onclick = async function () {
            // Join an RTC channel. With token
            await fetchToken();
            await rtc.client.join(options.appId, options.channel, options.token, options.uid);
            // Create a local audio track from the audio sampled by a microphone.
            rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            // Create a local video track from the video captured by a camera.
            rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
            // Publish the local audio and video tracks to the RTC channel.
            await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
            // Dynamically create a container in the form of a DIV element for playing the local video track.
            const localPlayerContainer = document.createElement("div");
            // Specify the ID of the DIV container. You can use the uid of the local user.
            localPlayerContainer.id = options.uid;
            localPlayerContainer.textContent = "Local user " + options.uid;
            localPlayerContainer.style.width = "640px";
            localPlayerContainer.style.height = "480px";
            document.body.append(localPlayerContainer);

            // Play the local video track.
            // Pass the DIV container and the SDK dynamically creates a player in the container for playing the local video track.
            rtc.localVideoTrack.play(localPlayerContainer);
            console.log("publish success!");
        };

        document.getElementById("leave").onclick = async function () {
            // Destroy the local audio and video tracks.
            rtc.localAudioTrack.close();
            rtc.localVideoTrack.close();

            // Remove the container for the local video track.
            const localPlayerContainer = document.getElementById(options.uid);
            if (localPlayerContainer) {
                localPlayerContainer.remove();
            }

            // Traverse all remote users.
            rtc.client.remoteUsers.forEach(user => {
                // Destroy the dynamically created DIV containers.
                const playerContainer = document.getElementById(user.uid);
                playerContainer && playerContainer.remove();
            });

            // Leave the channel.
            await rtc.client.leave();
        };
    };
}

startBasicCall();
