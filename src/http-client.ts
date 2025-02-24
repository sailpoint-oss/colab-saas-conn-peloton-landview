import { ConnectorError, StdTestConnectionOutput } from '@sailpoint/connector-sdk'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { logger } from './tools/logger'

export class HTTPClient {

    private readonly api_key?: string
    private base_url: string

    constructor(config: any) {
        this.api_key = config?.apiKey
        this.base_url = config?.baseUrl
        if (config.ignoreSSL) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        }
    }

    getEndpoint(service: string): string {
        let endpoint: string = ''
        const base_url = this.base_url
        switch (service) {
            case 'user':
                endpoint = `${base_url}/api/v1/sys_user`
                break
            case 'group':
                endpoint = `${base_url}/api/v1/sys_group`
                break
            case 'user_group':
                endpoint = `${base_url}/api/v1/user_group`
                break
            case 'sys_permission':
                endpoint = `${base_url}/api/v1/sys_permission`
                break
            case 'sys_group_permission':
                endpoint = `${base_url}/api/v1/sys_group_permission`
                break
        }
        return endpoint
    }
    //Retrieves all user accounts from sys_user table (using pagination)
    async getAccounts(): Promise<AxiosResponse> {
        const api_key = this.api_key

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user'),
            headers: {
                Authorization: `Bearer ${api_key}`,
            },
        }

        let data: any[] = []

        let response = await axios(request)
        const total = response.data.header.query_rows
        data = [...data, ...response.data.data]
        while (data.length < total) {
            request.baseURL = response.data.header.next_page
            response = await axios(request)
            data = [...data, ...response.data.data]
        }
        response.data = data

        return response
    }

    //Retrieves an account from the sys_user table using the supplied account id
    async getAccount(id: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user'),
            url: `/${id}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }
        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Account read successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to read account ${id}`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to read account ${id} - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    //Runs a query against the sys_user table to see if a user account already exists
    async queryAccount(email_address: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user'),
            url: `?email_address=${email_address}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Account query successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to query account ${email_address}`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to read account ${email_address} - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    //Creates new account in sys_user table
    async createAccount(user: object): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'post',
            baseURL: this.getEndpoint('user'),
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
            data: user
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Account create successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to create account`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to create account - ${error.response?.status} - ${error.response?.data}`)
            })

    }

    //Updates user status attribute to either 'I' (inactive) or 'A' (active)
    async updateUser(userId: string, requestBody: object): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'put',
            baseURL: this.getEndpoint('user'),
            url: `/${userId}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
            data: requestBody
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Account state change successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to change account state`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to change account state - ${error.response?.status} - ${error.response?.data}`)
            })

    }

    //Adds user to a group by inserting record into user_group table
    async assignUserGroup(userId: string, groupId: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'post',
            baseURL: this.getEndpoint('user_group'),
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
            data: {
                user_id: userId,
                group_id: groupId
            }
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Account provisioning successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to provision account`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to provision account - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    //Used to find if user is a member of a specific group so they can be removed or so a duplicate add request can be avoided
    async getUserGroupRel(userId: string, groupId: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user_group'),
            url: `?user_id=${userId}&group_id=${groupId}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
            data: {
                user_id: userId,
                group_id: groupId
            }
        }

        let response = await axios(request)

        return response
    }

    //Deletes record from user_group table to remove user from a specific group
    async removeUserGroup(userId: string, groupId: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'delete',
            baseURL: this.getEndpoint('user_group'),
            url: `/${groupId}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
            data: {
                user_id: userId,
                group_id: groupId
            }
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Account provisioning successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to provision account`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to provision account - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    //Used to find all user group memberships from user_group table
    async getUserGroups(id: string): Promise<AxiosResponse> {
        const api_key = this.api_key

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user_group'),
            url: `?user_id=${id}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'User group retrieval successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to retrieve user groups`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to retrieve user groups - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    //Used to aggregate groups as entitlements by querying the sys_group table
    async getGroups(): Promise<AxiosResponse> {
        const api_key = this.api_key

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('group'),
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        let data: any[] = []

        let response = await axios(request)
        const total = response.data.header.query_rows
        data = [...data, ...response.data.data]
        while (data.length < total) {
            request.baseURL = response.data.header.next_page
            response = await axios(request)
            data = [...data, ...response.data.data]
        }
        response.data = data

        return response
    }

    //Used to find metadata about specific group for get entitlement action
    async getGroup(id: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('group'),
            url: `/${id}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Group retrieval successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to retrieve group`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to retrieve group - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    async getGroupPermissions(id: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('sys_group_permission'),
            url: `?group_id=${id}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Group permissions retrieval successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to retrieve group permissions`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to retrieve group permissions - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    async getPermissions(): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('sys_permission'),
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Permission retrieval successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to retrieve permission`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to retrieve permission - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    async getPermission(id: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('sys_permission'),
            url: `/${id}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Permission retrieval successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to retrieve permission`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to retrieve permission - ${error.response?.status} - ${error.response?.data}`)
            })
    }
    async getPermissionGroups(id: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('sys_group_permission'),
            url: `?permission_id=${id}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
        }

        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Permission group retrieval successful',
                    statusCode: response.status,
                    response: response.data
                }
                )
                return response
            }).catch(error => {

                logger.info({
                    message: `Issue when trying to retrieve permission groups`,
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to retrieve permission groups - ${error.response?.status} - ${error.response?.data}`)
            })
    }

    async testConnection(): Promise<StdTestConnectionOutput> {
        const api_key = this.api_key

        let request: AxiosRequestConfig = {
            method: 'get',
            baseURL: this.getEndpoint('user'),
            headers: {
                Authorization: `Bearer ${api_key}`,
            },
        }
        return axios(request)
            .then(response => {
                logger.info({
                    message: 'Test connection succeeded',
                    statusCode: response.status
                }
                )
                return {}
            }).catch(error => {

                logger.info({
                    message: 'Issue when trying to connect to LandView',
                    statusCode: error.response?.status,
                    response: error.response?.data,
                    stack: error.stack
                });

                throw new ConnectorError(`Issue when trying to connect to LandView - ${error.response?.status} - ${error.response?.data}`)
            })
    }
}
