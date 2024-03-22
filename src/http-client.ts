import { ConnectorError, StdTestConnectionOutput, logger } from '@sailpoint/connector-sdk'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { Group } from './model/group'
import { readConfig } from '@sailpoint/connector-sdk'
import { Account } from './model/account'

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
        }
        return endpoint
    }

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

        let response = await axios(request)

        return response
    }

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

        let response = await axios(request)

        return response

    }

    async changeAccountStatus(userId: string,userStatus: string): Promise<AxiosResponse> {
        const api_key = this.api_key
        let request: AxiosRequestConfig = {
            method: 'put',
            baseURL: this.getEndpoint('user'),
            url: `/${userId}`,
            headers: {
                Authorization: `Bearer ${api_key}`,
                Accept: 'application/json',
            },
            data: {
                status: userStatus
            }
        }

        let response = await axios(request)

        return response

    }

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

        try {
            let response = await axios(request)
            return response
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error({
                    message: `Error occurred while processing request - ${error.response?.data?.error}`,
                    baseURL: error.config?.baseURL,
                    url: error.config?.url,
                    requestData: error.config?.data,
                })
                throw new Error(`Error assigning user group: ${error.response?.data.error}`)
            } else {
                throw error;
            }
        }
    }

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

        let response = await axios(request)

        return response
    }

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

        let response = await axios(request)

        return response
    }

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

        let response = await axios(request)

        return response
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
        let response = await axios(request)
        if (response.status !== 200 || !response.data.header) {
            throw new ConnectorError('Unable to connect to LandView')
        }

        return {}
    }
}
