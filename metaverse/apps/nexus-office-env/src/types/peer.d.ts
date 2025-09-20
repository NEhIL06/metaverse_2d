declare module './service/peer' {
    class PeerService {
      getAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit>;
      setLocalDescription(ans: RTCSessionDescriptionInit): Promise<void>;
      getOffer(): Promise<RTCSessionDescriptionInit>;
      addLocalStream(stream: MediaStream): void;
      addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
      onTrack(cb: (stream: MediaStream) => void): void;
      onIce(cb: (candidate: RTCIceCandidate) => void): void;
      reset(): void;
    }
  
    const peerService: PeerService;
    export default peerService;
  }
  