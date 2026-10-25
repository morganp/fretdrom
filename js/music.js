/* ============================================================
   Music theory helpers + tuning presets + examples.
   Exposes window.FDMusic = { PRESETS, EXAMPLES, NOTE_NAMES, NOTE_INDEX,
       INTERVAL_LABELS, noteToSemis, semisToNote, parseTuning,
       intervalsFromFrets, fretNumToChar, fretCharToNum }.
   ============================================================ */
(function(){

  /* ---------- TUNING PRESETS (with octaves for harmonic math) ---------- */
  const PRESETS = {
    'guitar-std':         'E2 A2 D3 G3 B3 E4',
    'guitar-dropd':       'D2 A2 D3 G3 B3 E4',
    'guitar-dadgad':      'D2 A2 D3 G3 A3 D4',
    'guitar-7':           'B1 E2 A2 D3 G3 B3 E4',
    'bass-4':             'E1 A1 D2 G2',
    'bass-5':             'B0 E1 A1 D2 G2',
    'bass-6':             'B0 E1 A1 D2 G2 C3',
    'uke-soprano':        'G4 C4 E4 A4',
    'uke-low-g':          'G3 C4 E4 A4',
    'uke-baritone':       'D3 G3 B3 E4',
    'bouz-irish':         'G2 D3 A3 D4',
    'bouz-greek':         'D3 A3 D4',
    'bouz-greek-tetra':   'C3 F3 A3 D4',
    'mando':              'G3 D4 A4 E5',
    'custom':             null,
  };

  /* ---------- EXAMPLES ---------- */
  const EXAMPLES = {
    'ex-c-maj': `// C Major, open position
{
  chord: {
    name: "C Major",
    tuning: "E2 A2 D3 G3 B3 E4",
    frets:   "x32010",
    fingers: "-32-1-",
    root_strings: [5],
  }
}`,
    'ex-f-barre': `// F Major barre
{
  chord: {
    name: "F Major",
    subtitle: "barre · I",
    tuning: "E2 A2 D3 G3 B3 E4",
    frets:   "133211",
    fingers: "134211",
    root_strings: [1, 6],
    barre: { fret: 1, from_string: 1, to_string: 6 },
  }
}`,
    'ex-e-intervals': `// E Major with interval labels
{
  chord: {
    name: "E Major",
    tuning: "E2 A2 D3 G3 B3 E4",
    frets:     "022100",
    intervals: ["R", "5", "R", "3", "5", "R"],
  }
}`,
    'ex-uke-c': `// Ukulele C
{
  chord: {
    name: "C (uke)",
    tuning: "G4 C4 E4 A4",
    frets:   "0003",
    fingers: "---3",
    root_strings: [2],
  }
}`,
    'ex-bass-e': `// Bass E (4-string)
{
  chord: {
    name: "E (bass)",
    tuning: "E1 A1 D2 G2",
    frets:   "0221",
    fingers: "-231",
    root_strings: [1],
  }
}`,
    'ex-am-pent': `// A minor pentatonic, box 1
{
  scale: {
    name: "A Minor Pentatonic",
    subtitle: "R  b3  4  5  b7",
    tuning: "E2 A2 D3 G3 B3 E4",
    start_fret: 5,
    num_frets: 5,
    grid: [
      ["R", ".", ".", "x", "."],
      ["x", ".", ".", "x", "."],
      ["x", ".", "x", ".", "."],
      ["x", ".", "x", ".", "."],
      ["x", ".", "x", ".", "."],
      ["R", ".", ".", "x", "."],
    ]
  }
}`,
    'ex-cmaj-scale': `// C Major scale, position 2
{
  scale: {
    name: "C Major",
    tuning: "E2 A2 D3 G3 B3 E4",
    start_fret: 2,
    num_frets: 4,
    grid: [
      ["x", ".", "R", "."],
      [".", "2", ".", "3"],
      ["4", ".", "5", "."],
      [".", "6", ".", "7"],
      ["R", ".", "2", "."],
      [".", "3", ".", "4"],
    ]
  }
}`,
    'ex-riff': `// Intro riff
{
  name: "Intro Riff",
  tab: [
    { name: "e", wave: "03.0...." },
    { name: "B", wave: "2.2....." },
    { name: "G", wave: "....2.3." },
    { name: "D", wave: "........" },
    { name: "A", wave: "........" },
    { name: "E", wave: "........" },
  ],
  config: { bar: 4 }
}`,
    'ex-bouz': `// Bouzouki picking pattern
{
  name: "Bouzouki Line",
  tab: [
    { name: "D", wave: "0.2.3.0." },
    { name: "A", wave: "....2..." },
    { name: "D", wave: "0......." },
    { name: "G", wave: "........" },
  ],
  config: { bar: 4 }
}`,
  };

  /* ---------- NOTE / INTERVAL MATH ---------- */
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NOTE_INDEX = (() => {
    const m = {};
    NOTE_NAMES.forEach((n,i)=>m[n]=i);
    m['Db']=1; m['Eb']=3; m['Gb']=6; m['Ab']=8; m['Bb']=10;
    return m;
  })();
  const INTERVAL_LABELS = ['R','b2','2','b3','3','4','b5','5','b6','6','b7','7'];

  function noteToSemis(s){
    const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(s.trim());
    if(!m) return null;
    const letter = m[1].toUpperCase() + (m[2]||'');
    const oct = parseInt(m[3],10);
    const n = NOTE_INDEX[letter];
    if(n==null) return null;
    return oct*12 + n;
  }

  function semisToNote(s){
    const oct = Math.floor(s/12);
    return NOTE_NAMES[((s%12)+12)%12] + oct;
  }

  function parseTuning(t){
    if(!t) return null;
    const tokens = t.trim().split(/\s+/);
    if(tokens.length === 1 && !/\d/.test(tokens[0])){
      return { compact:true, names: tokens[0].match(/[A-G][#b]?/gi) || [] };
    }
    const semis = tokens.map(noteToSemis);
    if(semis.some(x => x==null)) return null;
    return { compact:false, semis };
  }

  function intervalsFromFrets(fretStr, tuning, rootClass){
    const t = parseTuning(tuning);
    if(!t || t.compact) return null;
    const fretChars = Array.from(fretStr);
    if(fretChars.length !== t.semis.length) return null;

    const sounding = fretChars.map((c,i)=>{
      if(c==='x' || c==='X' || c==='-') return null;
      let n;
      if(/[0-9]/.test(c)) n = parseInt(c,10);
      else if(/[a-z]/i.test(c)) n = c.toLowerCase().charCodeAt(0) - 97 + 10;
      else return null;
      return t.semis[i] + n;
    });

    const playing = sounding.filter(x=>x!=null);
    if(!playing.length) return null;

    let root;
    if(rootClass != null && rootClass !== ''){
      const rc = +rootClass;
      const matches = playing.filter(p => ((p%12)+12)%12 === rc);
      root = matches.length ? Math.min(...matches) : (Math.min(...playing) - (((Math.min(...playing)-rc)%12+12)%12));
    }else{
      root = Math.min(...playing);
    }
    return sounding.map(s => s==null ? null : INTERVAL_LABELS[((s-root)%12+12)%12]);
  }

  // fret number → fretdrom char
  function fretNumToChar(n){
    if(n===-1) return 'x';
    if(n>=0 && n<10) return String(n);
    if(n>=10 && n<36) return String.fromCharCode(97+n-10);
    return '0';
  }
  // fretdrom char → fret number (-1 for muted, null for skip)
  function fretCharToNum(c){
    if(c==null) return null;
    if(c==='x'||c==='X') return -1;
    if(c==='-'||c==='.') return null;
    if(/[0-9]/.test(c)) return parseInt(c,10);
    if(/[a-z]/i.test(c)) return c.toLowerCase().charCodeAt(0)-97+10;
    return null;
  }

  window.FDMusic = {
    PRESETS, EXAMPLES, NOTE_NAMES, NOTE_INDEX, INTERVAL_LABELS,
    noteToSemis, semisToNote, parseTuning, intervalsFromFrets,
    fretNumToChar, fretCharToNum,
  };
})();
