const startedKey = 'runner➤started'
const stoppedKey = 'runner➤stopped'

let runners = []
let nextFrameTimer = null

function noop() {}

function tick() {
  let now = Date.now()

  // Sync each runner, filtering out empty ones as we go
  runners = runners.filter(runner => {
    if (!runner.tweens || runner.tweens.length === 0) {
      return false
    }
    else {
      runner._tick(now)
      return true
    }
  })

  // Queue next tick if there are still active runners
  nextFrameTimer = null
  if (runners.length) {
    queueFrame()
  }
}

function queueFrame() {
  if (!nextFrameTimer) {
    nextFrameTimer = requestAnimationFrame(tick)
  }
}

function startRunner(runner) {
  if (!runner.running) {
    runner.running = true
    runners.push(runner)
    queueFrame()
  }
}

function stopRunner(runner) {
  runner.running = false
}


/**
 * @class Runner
 * A container for {@link Tween} instances that handles invoking them on each animation frame.
 */
class Runner {
  constructor() {
    this.tweens = []
  }

  destructor() {
    this.tweens = null
    stopRunner(this)
    this.start = this.stop = this.tick = noop
  }

  /**
   * Add a tween to the runner. It will be invoked on the next frame, not immediately.
   * @param {Tween} tween
   */
  start(tween) {
    // add tween to list
    tween[startedKey] = Date.now()
    this.tweens.push(tween)

    // add runner to running runners
    startRunner(this)
  }

  /**
   * Remove a tween from the runner.
   * @param tween
   */
  stop(tween) {
    // queue tween for removal from list on next tick
    tween[stoppedKey] = true
  }

  _tick(now) {
    let tweens = this.tweens
    let hasStoppedTweens = false

    // Sync each tween, filtering out old finished ones as we go
    for (let i = 0, len = tweens.length; i < len; i++) {
      let tween = tweens[i]
      if (tween[stoppedKey]) {
        hasStoppedTweens = true
      } else {
        // Sync the tween to current time
        let time = now - tween[startedKey]
        tween.gotoTime(time)

        // Queue for removal if we're past its end time
        if (tween.isDoneAtTime(time)) {
          this.stop(tween)
          if (tween.onDone) {
            tween.onDone()
          }
        }
      }
    }

    // Prune list if needed
    // TODO perhaps batch this up so it happens less often
    if (hasStoppedTweens) {
      this.tweens = tweens.filter(tween => !tween[stoppedKey])

      // remove runner from running runners if it has no tweens left
      if (!this.tweens.length) {
        stopRunner(this)
      }
    }

    this.onTick()
  }

  /**
   * Override to specify a function that will be called at the end of every frame, after all
   * tweens have been updated.
   */
  onTick() {
    // abstract
  }
}

export default Runner
