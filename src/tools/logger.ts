import { logger as SDKLogger } from '@sailpoint/connector-sdk'

export const logger = SDKLogger.child(
    { connectorName: 'LandView' }
)