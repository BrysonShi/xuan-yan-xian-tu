/**
 * 音频管理器 - 使用 Web Audio API 合成古风背景音乐和音效
 * 无需外部音频文件，所有声音通过振荡器实时合成
 * @module utils/audioManager
 */

// ─── 五声音阶频率表（宫商角徵羽 = C D E G A，跨三个八度） ───
const PENTATONIC = {
  // 低音区
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
  // 中音区
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  // 高音区
  C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.00,
};

// ─── BGM 琶音序列（营造空灵修仙氛围） ───
const ARP_SEQUENCE = [
  // 第一乐句：上行，宁静致远
  PENTATONIC.C3, PENTATONIC.E3, PENTATONIC.G3, PENTATONIC.A3,
  PENTATONIC.C4, PENTATONIC.E4, PENTATONIC.G4, PENTATONIC.E4,
  // 第二乐句：回旋，余韵悠长
  PENTATONIC.D4, PENTATONIC.G3, PENTATONIC.E3, PENTATONIC.D3,
  PENTATONIC.C3, PENTATONIC.E3, PENTATONIC.G3, PENTATONIC.C4,
  // 第三乐句：高远，仙气缥缈
  PENTATONIC.A3, PENTATONIC.C4, PENTATONIC.D4, PENTATONIC.E4,
  PENTATONIC.G4, PENTATONIC.A4, PENTATONIC.G4, PENTATONIC.E4,
  // 第四乐句：归寂，回到宁静
  PENTATONIC.D4, PENTATONIC.C4, PENTATONIC.A3, PENTATONIC.G3,
  PENTATONIC.E3, PENTATONIC.D3, PENTATONIC.C3, PENTATONIC.G3,
];

// 低音伴奏序列（根音，缓慢变化）
const BASS_SEQUENCE = [
  PENTATONIC.C3 / 2, PENTATONIC.C3 / 2,  // 宫
  PENTATONIC.G3 / 2, PENTATONIC.G3 / 2,  // 徵
  PENTATONIC.A3 / 2, PENTATONIC.A3 / 2,  // 羽
  PENTATONIC.D3 / 2, PENTATONIC.D3 / 2,  // 商
  PENTATONIC.E3 / 2, PENTATONIC.E3 / 2,  // 角
  PENTATONIC.C3 / 2, PENTATONIC.C3 / 2,  // 宫
  PENTATONIC.G3 / 2, PENTATONIC.G3 / 2,  // 徵
  PENTATONIC.C3 / 2, PENTATONIC.C3 / 2,  // 宫（回归）
];

class AudioManager {
  constructor() {
    this._ctx = null;          // AudioContext
    this._masterGain = null;   // 主音量
    this._bgmGain = null;      // BGM 音量节点
    this._sfxGain = null;      // SFX 音量节点
    this._initialized = false;
    this._bgmEnabled = true;
    this._sfxEnabled = true;
    this._bgmPlaying = false;
    this._bgmVolume = 0.7;
    this._sfxVolume = 0.8;

    // BGM 振荡器引用（用于停止）
    this._arpOsc = null;
    this._arpGain = null;
    this._bassOsc = null;
    this._bassGain = null;
    this._padOscs = [];
    this._padGain = null;
    this._bgmSchedulerId = null;
    this._bgmStepIndex = 0;
    this._bassStepIndex = 0;
  }

  /**
   * 初始化 AudioContext（必须在用户交互事件中调用）
   */
  init() {
    if (this._initialized) {
      // 如果已初始化但被挂起，恢复它
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        console.warn('[AudioManager] 浏览器不支持 Web Audio API');
        return;
      }

      this._ctx = new AC();

      // 创建主音量节点
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 1.0;
      this._masterGain.connect(this._ctx.destination);

      // 创建 BGM 音量节点
      this._bgmGain = this._ctx.createGain();
      this._bgmGain.gain.value = this._bgmVolume;
      this._bgmGain.connect(this._masterGain);

      // 创建 SFX 音量节点
      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this._masterGain);

      this._initialized = true;
      console.log('[AudioManager] 音频系统初始化成功');
    } catch (err) {
      console.warn('[AudioManager] 初始化失败:', err);
    }
  }

  // ─── 音量控制 ───

  setBgmVolume(v) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this._bgmGain) {
      this._bgmGain.gain.setTargetAtTime(this._bgmVolume, this._ctx.currentTime, 0.1);
    }
  }

  setSfxVolume(v) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this._sfxGain) {
      this._sfxGain.gain.setTargetAtTime(this._sfxVolume, this._ctx.currentTime, 0.1);
    }
  }

  // ─── BGM 开关 ───

  toggleBgm(on) {
    this._bgmEnabled = on;
    if (!on) {
      this.stopBgm();
    } else if (this._initialized && !this._bgmPlaying) {
      this.startBgm();
    }
  }

  toggleSfx(on) {
    this._sfxEnabled = on;
  }

  // ─── BGM 播放控制 ───

  /**
   * 开始播放 BGM（五声音阶琶音 + 低音 + 和弦垫底）
   */
  startBgm() {
    if (!this._initialized || !this._bgmEnabled || this._bgmPlaying) return;

    const ctx = this._ctx;
    const now = ctx.currentTime;

    // ── 1. 创建混响（用 DelayNode 模拟简易混响） ──
    // 使用多个延迟节点叠加创造空间感
    const delay1 = ctx.createDelay(1.0);
    delay1.delayTime.value = 0.12;
    const delay1Gain = ctx.createGain();
    delay1Gain.gain.value = 0.2;
    delay1.connect(delay1Gain);
    delay1Gain.connect(this._bgmGain);

    const delay2 = ctx.createDelay(1.0);
    delay2.delayTime.value = 0.25;
    const delay2Gain = ctx.createGain();
    delay2Gain.gain.value = 0.12;
    delay2.connect(delay2Gain);
    delay2Gain.connect(this._bgmGain);

    // ── 2. 琶音振荡器（正弦波，柔和空灵） ──
    this._arpOsc = ctx.createOscillator();
    this._arpOsc.type = 'sine';
    this._arpOsc.frequency.value = ARP_SEQUENCE[0];

    this._arpGain = ctx.createGain();
    this._arpGain.gain.value = 0;

    // 信号路由：振荡器 → 增益 → BGM音量 + 延迟(混响)
    this._arpOsc.connect(this._arpGain);
    this._arpGain.connect(this._bgmGain);
    this._arpGain.connect(delay1);
    this._arpGain.connect(delay2);

    // ── 3. 低音振荡器（三角波，温暖沉稳） ──
    this._bassOsc = ctx.createOscillator();
    this._bassOsc.type = 'triangle';
    this._bassOsc.frequency.value = BASS_SEQUENCE[0];

    this._bassGain = ctx.createGain();
    this._bassGain.gain.value = 0.08;

    this._bassOsc.connect(this._bassGain);
    this._bassGain.connect(this._bgmGain);

    // ── 4. 和弦垫底（三个正弦波叠加，极轻柔） ──
    this._padGain = ctx.createGain();
    this._padGain.gain.value = 0.03;
    this._padGain.connect(this._bgmGain);
    this._padGain.connect(delay2);

    // 和弦音：宫 + 角 + 徵（C4, E4, G4）持续轻响
    const padFreqs = [PENTATONIC.C4, PENTATONIC.E4, PENTATONIC.G4];
    this._padOscs = padFreqs.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(this._padGain);
      osc.start(now);
      return osc;
    });

    // ── 5. 启动琶音调度器 ──
    this._bgmStepIndex = 0;
    this._bassStepIndex = 0;
    this._bgmPlaying = true;
    this._scheduleBgmStep();

    // 启动低音
    this._bassOsc.start(now);

    // 淡入效果
    this._arpGain.gain.setTargetAtTime(0.15, now, 0.5);
    this._padGain.gain.setTargetAtTime(0.03, now, 1.0);

    console.log('[AudioManager] BGM 开始播放');
  }

  /**
   * BGM 琶音调度（每个音符播放一定时长后切换）
   */
  _scheduleBgmStep() {
    if (!this._bgmPlaying || !this._ctx) return;

    const ctx = this._ctx;
    const now = ctx.currentTime;
    const noteDuration = 1.2; // 每个音符持续 1.2 秒

    // 更新琶音频率
    const arpFreq = ARP_SEQUENCE[this._bgmStepIndex % ARP_SEQUENCE.length];
    if (this._arpOsc) {
      this._arpOsc.frequency.setTargetAtTime(arpFreq, now, 0.08);
    }

    // 琶音包络（柔和的淡入淡出）
    if (this._arpGain) {
      this._arpGain.gain.setTargetAtTime(0.15, now, 0.15);
      this._arpGain.gain.setTargetAtTime(0.05, now + noteDuration * 0.6, 0.3);
    }

    // 每 4 个琶音步更新一次低音
    if (this._bgmStepIndex % 2 === 0) {
      const bassFreq = BASS_SEQUENCE[this._bassStepIndex % BASS_SEQUENCE.length];
      if (this._bassOsc) {
        this._bassOsc.frequency.setTargetAtTime(bassFreq, now, 0.3);
      }
      this._bassStepIndex++;
    }

    // 偶尔微调垫底和弦（每 8 步轻微变化）
    if (this._bgmStepIndex % 8 === 0 && this._padOscs.length === 3) {
      const chordSets = [
        [PENTATONIC.C4, PENTATONIC.E4, PENTATONIC.G4],  // 宫和弦
        [PENTATONIC.A3, PENTATONIC.C4, PENTATONIC.E4],  // 羽和弦
        [PENTATONIC.G3, PENTATONIC.A3, PENTATONIC.D4],  // 徵-商和弦
        [PENTATONIC.C4, PENTATONIC.D4, PENTATONIC.G4],  // 宫-商挂留
      ];
      const chordIdx = Math.floor(this._bgmStepIndex / 8) % chordSets.length;
      const chord = chordSets[chordIdx];
      this._padOscs.forEach((osc, i) => {
        if (chord[i]) {
          osc.frequency.setTargetAtTime(chord[i], now, 0.5);
        }
      });
    }

    this._bgmStepIndex++;

    // 调度下一步
    this._bgmSchedulerId = setTimeout(() => {
      this._scheduleBgmStep();
    }, noteDuration * 1000);
  }

  /**
   * 停止 BGM（淡出后停止）
   */
  stopBgm() {
    if (!this._bgmPlaying) return;
    this._bgmPlaying = false;

    if (this._bgmSchedulerId) {
      clearTimeout(this._bgmSchedulerId);
      this._bgmSchedulerId = null;
    }

    const ctx = this._ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const fadeTime = 1.0;

    // 淡出
    if (this._arpGain) {
      this._arpGain.gain.setTargetAtTime(0, now, 0.3);
    }
    if (this._padGain) {
      this._padGain.gain.setTargetAtTime(0, now, 0.5);
    }
    if (this._bassGain) {
      this._bassGain.gain.setTargetAtTime(0, now, 0.4);
    }

    // 延迟后停止振荡器
    setTimeout(() => {
      try {
        if (this._arpOsc) { this._arpOsc.stop(); this._arpOsc.disconnect(); this._arpOsc = null; }
        if (this._bassOsc) { this._bassOsc.stop(); this._bassOsc.disconnect(); this._bassOsc = null; }
        this._padOscs.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch {} });
        this._padOscs = [];
      } catch {}
    }, fadeTime * 1000 + 200);

    console.log('[AudioManager] BGM 已停止');
  }

  // ─── SFX 音效 ───

  /**
   * 按钮点击音效 - 短促清脆的"叮"
   */
  playClick() {
    if (!this._initialized || !this._sfxEnabled) return;
    try {
      this._playTone({
        freq: PENTATONIC.E5,
        type: 'sine',
        volume: 0.12,
        attack: 0.005,
        decay: 0.08,
        sustain: 0,
        release: 0.06,
      });
    } catch {}
  }

  /**
   * 选择确认音效 - 温暖和弦（双音叠加）
   */
  playChoice() {
    if (!this._initialized || !this._sfxEnabled) return;
    try {
      const ctx = this._ctx;
      const now = ctx.currentTime;

      // 主音
      this._playTone({
        freq: PENTATONIC.G4,
        type: 'sine',
        volume: 0.1,
        attack: 0.01,
        decay: 0.15,
        sustain: 0.05,
        release: 0.2,
      });

      // 和声（高五度）
      setTimeout(() => {
        this._playTone({
          freq: PENTATONIC.D5,
          type: 'sine',
          volume: 0.08,
          attack: 0.01,
          decay: 0.12,
          sustain: 0.03,
          release: 0.15,
        });
      }, 50);
    } catch {}
  }

  /**
   * 突破音效 - 渐强升调 + 和弦爆发
   */
  playBreakthrough() {
    if (!this._initialized || !this._sfxEnabled) return;
    try {
      const ctx = this._ctx;
      const now = ctx.currentTime;

      // 升调扫频（从低频到高频）
      const sweepOsc = ctx.createOscillator();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(PENTATONIC.C3, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(PENTATONIC.C5, now + 1.2);

      const sweepGain = ctx.createGain();
      sweepGain.gain.setValueAtTime(0.02, now);
      sweepGain.gain.linearRampToValueAtTime(0.15, now + 1.0);
      sweepGain.gain.linearRampToValueAtTime(0, now + 1.5);

      sweepOsc.connect(sweepGain);
      sweepGain.connect(this._sfxGain);
      sweepOsc.start(now);
      sweepOsc.stop(now + 1.6);

      // 爆发和弦（在 1.0 秒时触发）
      setTimeout(() => {
        const chordFreqs = [PENTATONIC.C5, PENTATONIC.E5, PENTATONIC.G5];
        chordFreqs.forEach((freq, i) => {
          setTimeout(() => {
            this._playTone({
              freq,
              type: 'sine',
              volume: 0.1,
              attack: 0.01,
              decay: 0.3,
              sustain: 0.04,
              release: 0.5,
            });
          }, i * 40);
        });
      }, 900);
    } catch {}
  }

  /**
   * 跳过文字音效 - 轻微的"嗒"
   */
  playTextSkip() {
    if (!this._initialized || !this._sfxEnabled) return;
    try {
      this._playTone({
        freq: 800,
        type: 'sine',
        volume: 0.04,
        attack: 0.002,
        decay: 0.03,
        sustain: 0,
        release: 0.02,
      });
    } catch {}
  }

  /**
   * 场景切换音效 - 轻柔的风铃声（三个泛音依次响起）
   */
  playTransition() {
    if (!this._initialized || !this._sfxEnabled) return;
    try {
      const notes = [PENTATONIC.E5, PENTATONIC.G5, PENTATONIC.C5];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          this._playTone({
            freq,
            type: 'sine',
            volume: 0.08,
            attack: 0.01,
            decay: 0.2,
            sustain: 0.02,
            release: 0.4,
          });
        }, i * 100);
      });
    } catch {}
  }

  // ─── 内部工具方法 ───

  /**
   * 播放单个音调（带 ADSR 包络）
   * @param {object} opts
   * @param {number} opts.freq - 频率 (Hz)
   * @param {string} opts.type - 波形类型 (sine/triangle/square/sawtooth)
   * @param {number} opts.volume - 音量 (0-1)
   * @param {number} opts.attack - 起音时间 (秒)
   * @param {number} opts.decay - 衰减时间 (秒)
   * @param {number} opts.sustain - 延音量 (0-1, 相对 volume)
   * @param {number} opts.release - 释音时间 (秒)
   */
  _playTone({ freq, type, volume, attack, decay, sustain, release }) {
    const ctx = this._ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const totalDuration = attack + decay + release + 0.05;

    // 振荡器
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;

    // ADSR 包络
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + totalDuration);

    osc.connect(gain);
    gain.connect(this._sfxGain);

    osc.start(now);
    osc.stop(now + totalDuration + 0.05);
  }
}

/** 全局音频管理器单例 */
export const audioManager = new AudioManager();
