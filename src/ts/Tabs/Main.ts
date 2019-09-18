import { MidiEvent, parseMidiFile } from './MidiParser.js';

(async () => {
    const rawMidi = await fetch('/build/src/midi/untitled.mid');
    const midi = parseMidiFile(await rawMidi.arrayBuffer());

    const rawNotes = midi.tracks[1].filter((event) => event.subType === 'noteOn' || event.subType === 'noteOff');
    const notes: [MidiEvent, MidiEvent][] = [];
    for (let i = 0; i < rawNotes.length; i += 2) {
        notes.push(rawNotes.slice(i, i + 2) as [MidiEvent, MidiEvent]);
    }

    const playMidi = (audio: AudioContext) => {
        while (notes.length > 0) {
            const [startNote, endNote] = notes.shift()!;
            const osc = audio.createOscillator();
            osc.frequency.value = 440;
            osc.connect(audio.destination);
            osc.start(audio.currentTime + (startNote.deltaTime > 0 ? (1 / startNote.deltaTime) : 0));
            osc.stop(audio.currentTime + (endNote.deltaTime > 0 ? (1 / endNote.deltaTime) : 0));
        }
    };

    const play = document.getElementById('play')!;
    play.addEventListener('click', (event: Event) => {
        event.preventDefault();
        const audio = new AudioContext();
        playMidi(audio);
    });
})();
