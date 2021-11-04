import * as core from '@actions/core'
import {CiError} from '@datadog/datadog-ci/dist/commands/synthetics/errors'
import {DefaultReporter} from '@datadog/datadog-ci/dist/commands/synthetics/reporters/default'
import {executeTests} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {getReporter} from '@datadog/datadog-ci/dist/commands/synthetics/utils'
import {renderResults} from './process-results'

import {BaseContext} from 'clipanion'
import {resolveConfig} from './resolve-config'
import {reportCiError} from './report-ci-error'
import {Summary} from '@datadog/datadog-ci/dist/commands/synthetics/interfaces'

const run = async (): Promise<void> => {
  const context = {
    context: {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    } as BaseContext,
  }

  const reporter = getReporter([new DefaultReporter(context as any)])
  const config = await resolveConfig()

  try {
    const startTime = Date.now()
    const {results, summary, tests, triggers} = await executeTests(reporter, config)
    const resultSummary = renderResults(results, summary, tests, triggers, config, startTime, reporter)
    if (
      resultSummary.criticalErrors > 0 ||
      resultSummary.failed > 0 ||
      resultSummary.timedOut > 0 ||
      resultSummary.testsNotFound.size > 0
    ) {
      core.setFailed(`Datadog Synthetics tests failed : ${printSummary(resultSummary)}`)
    } else {
      core.info(`Datadog Synthetics tests succeeded : ${printSummary(resultSummary)}`)
    }
  } catch (error) {
    if (error instanceof CiError) {
      reportCiError(error, reporter)
    }
    core.setFailed('Running Datadog Synthetics tests failed.')
  }
}

export const printSummary = (summary: Summary) =>
  `criticalErrors: ${summary.criticalErrors}, passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, notFound: ${summary.testsNotFound.size}, timedOut: ${summary.timedOut}`

if (require.main === module) {
  run()
}

export default run
