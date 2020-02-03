import { UserRepository } from 'core/repositories'
import { AnalyticsRepository, MetricName } from 'core/repositories/analytics-repository'
import { TYPES } from 'core/types'
import { inject, injectable } from 'inversify'
import moment from 'moment'

@injectable()
export default class AnalyticsService {
  constructor(
    @inject(TYPES.AnalyticsRepository) private analyticsRepo: AnalyticsRepository,
    @inject(TYPES.UserRepository) private userRepo: UserRepository
  ) {}

  async incrementMetric(botId: string, channel: string, metric: MetricName) {
    try {
      const analytic = await this.analyticsRepo.get({ botId, channel, metric })
      const latest = moment(analytic.created_on).startOf('day')
      const today = moment().startOf('day')

      // Aggregate metrics per day
      if (latest.isBefore(today)) {
        await this.analyticsRepo.insert({ botId, channel, metric, value: 1 })
      } else {
        await this.analyticsRepo.update(analytic.id, analytic.value + 1)
      }
    } catch (err) {
      await this.analyticsRepo.insert({ botId, channel, metric, value: 1 })
    }
  }

  async getDateRange(botId: string, startDate: string, endDate: string, channel?: string) {
    const analytics = await this.analyticsRepo.getBetweenDates(
      botId,
      this.formatUnixToISO(startDate),
      this.formatUnixToISO(endDate),
      channel
    )

    const userCount = await this.userRepo.getUserCount(channel)
    const userCountMetric = {
      metric_name: 'user_count',
      value: userCount
    }

    return [...analytics, userCountMetric]
  }

  private formatUnixToISO(unix) {
    const momentDate = moment.unix(unix)
    if (!momentDate.isValid()) {
      throw new Error(`Invalid unix timestamp format ${unix}.`)
    }

    return momentDate.toISOString()
  }
}
