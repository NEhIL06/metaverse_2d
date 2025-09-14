// PeerService.js
class PeerService {
  constructor() {
    this._makePeer();
    this.onTrackCallback = null;
    this.onIceCallback = null;
  }

  _makePeer() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
      ],
    });

    // ontrack -> call callback with stream
    this.peer.ontrack = (ev) => {
      // ev.streams is typically available; combine them into one stream if multiple
      const remoteStream = ev.streams && ev.streams[0] ? ev.streams[0] : new MediaStream();
      if (this.onTrackCallback) this.onTrackCallback(remoteStream);
    };

    // onicecandidate -> pass candidate outward
    this.peer.onicecandidate = (ev) => {
      if (ev.candidate && this.onIceCallback) {
        this.onIceCallback(ev.candidate);
      }
    };
  }

  async getAnswer(offer) {
    if (!this.peer) this._makePeer();
    await this.peer.setRemoteDescription(offer);
    const ans = await this.peer.createAnswer();
    await this.peer.setLocalDescription(ans);
    return ans;
  }

  async setLocalDescription(ans) {
    // NOTE: your original setLocalDescription set remote description; keep naming but
    // behave like "setRemoteDescriptionFromAnswer" for initiator.
    if (!this.peer) this._makePeer();
    await this.peer.setRemoteDescription(ans);
  }

  async getOffer() {
    if (!this.peer) this._makePeer();
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  // Add tracks from local stream so they are sent to the remote peer
  addLocalStream(stream) {
    if (!this.peer) this._makePeer();
    stream.getTracks().forEach((t) => this.peer.addTrack(t, stream));
  }

  // Add remote ICE candidate received from remote peer
  async addIceCandidate(candidate) {
    if (!this.peer) return;
    try {
      await this.peer.addIceCandidate(candidate);
    } catch (e) {
      // sometimes candidate is null or already handled; ignore safely
      console.warn("addIceCandidate error", e);
    }
  }

  // register callbacks
  onTrack(cb) { this.onTrackCallback = cb; }
  onIce(cb) { this.onIceCallback = cb; }

  // Reset peer connection
  reset() {
    if (this.peer) {
      try { this.peer.close(); } catch (e) {}
    }
    this._makePeer();
  }
}

export default new PeerService();
