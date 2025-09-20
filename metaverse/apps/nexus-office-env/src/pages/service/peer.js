// PeerService.js
class PeerService {
  constructor() {
    this.onTrackCallback = null;
    this.onIceCallback = null;
    this._makePeer();
  }

  _makePeer() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
      ],
    });

    // attach listeners
    this.peer.ontrack = (ev) => {
      const remoteStream = ev.streams?.[0] || new MediaStream();
      if (this.onTrackCallback) {
        this.onTrackCallback(remoteStream);
      }
    };

    this.peer.onicecandidate = (ev) => {
      if (ev.candidate && this.onIceCallback) {
        this.onIceCallback(ev.candidate);
      }
    };

    // re-apply callbacks if set before reset
    if (this.onTrackCallback) this.onTrack(this.onTrackCallback);
    if (this.onIceCallback) this.onIce(this.onIceCallback);
  }

  // Create offer (initiator)
  async getOffer() {
    if (!this.peer) this._makePeer();
    // Ensure we have tracks already
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  // Handle incoming offer (callee)
  async getAnswer(offer) {
    if (!this.peer) this._makePeer();
    await this.peer.setRemoteDescription(offer);
    const ans = await this.peer.createAnswer();
    await this.peer.setLocalDescription(ans);
    return ans;
  }

  // Apply remote answer (initiator)
  async setRemoteAnswer(ans) {
    if (!this.peer) this._makePeer();
    await this.peer.setRemoteDescription(ans);
  }

  // Add local tracks BEFORE calling getOffer() or getAnswer()
  addLocalStream(stream) {
    if (!this.peer) this._makePeer();
    stream.getTracks().forEach((t) => this.peer.addTrack(t, stream));
  }

  async addIceCandidate(candidate) {
    if (!this.peer) return;
    try {
      await this.peer.addIceCandidate(candidate);
    } catch (e) {
      console.warn("addIceCandidate error", e);
    }
  }

  onTrack(cb) {
    this.onTrackCallback = cb;
    if (this.peer) this.peer.ontrack = (ev) => {
      const remoteStream = ev.streams?.[0] || new MediaStream();
      cb(remoteStream);
    };
  }

  onIce(cb) {
    this.onIceCallback = cb;
    if (this.peer) this.peer.onicecandidate = (ev) => {
      if (ev.candidate) cb(ev.candidate);
    };
  }

  reset() {
    if (this.peer) {
      try { this.peer.close(); } catch (e) {}
    }
    this._makePeer();
  }
}

export default new PeerService();
