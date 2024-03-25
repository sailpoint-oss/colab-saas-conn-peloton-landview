import {ConnectorError, ConnectorErrorType} from '@sailpoint/connector-sdk';

/**
 * Thrown when an application missing configuration during initialization
 */

export class InvalidConfigurationException extends ConnectorError {
  constructor(message: string, type?: ConnectorErrorType) {
    super(message, type);
    this.name = 'InvalidConfigurationException';
  }
}
export class InsufficientPermissionException extends ConnectorError {
    /**
     * Constructor
     * @param message Error message
     * @param type ConnectorErrorType they type of error
     */
    constructor(message: string, type?: ConnectorErrorType) {
      super(message, type);
      this.name = 'InsufficientPermissionException';
    }
  }
  export class InvalidRequestException extends ConnectorError {
    /**
     * Constructor
     * @param message Error message
     * @param type ConnectorErrorType they type of error
     */
    constructor(message: string, type?: ConnectorErrorType) {
      super(message, type);
      this.name = 'InvalidRequestException';
    }
  }