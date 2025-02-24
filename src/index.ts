import { AxiosResponse } from 'axios'
import {
    Context,
    ConnectorError,
    createConnector,
    readConfig,
    Response,
    StdAccountCreateInput,
    StdAccountCreateOutput,
    StdAccountListInput,
    StdAccountListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    StdAccountUpdateInput,
    StdAccountUpdateOutput,
    StdEntitlementListOutput,
    StdEntitlementReadOutput,
    StdEntitlementReadInput,
    StdTestConnectionInput,
    StdTestConnectionOutput,
    AttributeChangeOp,
    StdAccountDisableInput,
    StdAccountDisableOutput,
    StdAccountEnableOutput,
    StdAccountEnableInput,
    AttributeChange,
} from '@sailpoint/connector-sdk'
import { HTTPClient } from './http-client'
import { Account } from './model/account'
import { Group } from './model/group'
import { Permission } from './model/permission'
import {logger} from './tools/logger'

// Connector must be exported as module property named connector
export const connector = async () => {

    // Get connector source config
    const config = await readConfig()

    // Use the vendor SDK, or implement own client as necessary, to initialize a client
    const httpClient = new HTTPClient(config)

    const readAccount = async (id: string): Promise<Account> => {
        const account_response: AxiosResponse = await httpClient.getAccount(id)
        const account: Account = new Account(account_response.data.data[0])

        const groups_response: AxiosResponse = await httpClient.getUserGroups(id)
        const groups = groups_response.data.data.map((x: { group_id: any }) => x.group_id.toString())
        account.attributes.groups = groups

        return account
    }
    const readGroup = async (id: string): Promise<Group> => {
        const group_response: AxiosResponse = await httpClient.getGroup(id)
        const group: Group = new Group (group_response.data.data[0])

        const group_permissions_response: AxiosResponse = await httpClient.getGroupPermissions(id)
        const permissions = group_permissions_response.data.data.map((x: { permission_id: any }) => x.permission_id.toString())
        group.attributes.permissions = permissions

        return group
    }

    const readPermission = async (id: string): Promise<Permission> => {
        const permission_response: AxiosResponse = await httpClient.getPermission(id)
        const permission: Permission = new Permission (permission_response.data.data[0])

        const permission_groups_response: AxiosResponse = await httpClient.getPermissionGroups(id)
        const groups = permission_groups_response.data.data.map((x: { group_id: any }) => x.group_id.toString())
        permission.attributes.groups = groups

        return permission
    }

    const assignUserGroup = async (account: Account, group: string) => {
        //double-check access isn't already assigned to avoid a unique constraint error
        const access_response = await httpClient.getUserGroupRel(account.identity, group)
        if (access_response.data.header.data_rows == 0) {
            await httpClient.assignUserGroup(account.identity, group)
        }
        else {
            logger.info(`std:account:update - Not sending a provisioning request for ${account.attributes.full_name} into group id ${group} since user already has access assigned`)
        }
    }

    const removeUserGroup = async (account: Account, group: string) => {
        const user_group_response = await httpClient.getUserGroupRel(account.identity, group)
        const response = await httpClient.removeUserGroup(account.identity, user_group_response.data.data[0].rel_id)

        return response
    }

    return createConnector()
        .stdTestConnection(async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
            logger.info('Running test connection')
            res.send(await httpClient.testConnection())
        })
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            logger.info('Reading accounts from LandView')
            const accounts: AxiosResponse = await httpClient.getAccounts()

            for (const acc of accounts.data) {
                const account: Account = await readAccount(acc.user_id)
                logger.info(account)
                res.send(account)
            }

        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            logger.info(`Reading account with Id - ${input.identity}`)
            const account = await readAccount(input.identity)
            res.send(account)
        })
        .stdAccountCreate(
            async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
                logger.info(`${input}`)
                let account

                //Checks to see if account already exists, in case it was created outside of IdN in between aggregations
                const account_query = await httpClient.queryAccount(input.attributes.email_address)
                if (account_query.data.header.dataRows > 0) {
                    account = await readAccount(account_query.data.user_id)
                    logger.info(`A new account for ${input.attributes.full_name} will not be created because
                    an existing account was found with the same email address - account id is ${account.attributes.user_id}`)
                }
                else {
                    const user = { ...input.attributes, ...{ groups: undefined } }
                    const account_response = await httpClient.createAccount(user)
                    account = await readAccount(account_response.data.user_id)

                    if (input.attributes.groups) {
                        if (Array.isArray(input.attributes.groups)) {
                            for (const group of input.attributes.groups) {
    
                                await assignUserGroup(account,group)
                            }
                        } else if (typeof input.attributes.groups === 'string') {
                            const change: AttributeChange = {
                                op: AttributeChangeOp.Add,
                                attribute: 'safeRoles',
                                value: input.attributes.safeRoles,
                            }
    
                            await assignUserGroup(account,input.attributes.groups)
                        }
                    }

                    account = await readAccount(account_response.data.user_id)
                    logger.info(`New Account Created for ${input.attributes.full_name} - account id is ${account.identity}`)
                }

                res.send(account)
            }
        )
        .stdAccountEnable(async (context: Context, input: StdAccountEnableInput, res: Response<StdAccountEnableOutput>) => {
            const account = await readAccount(input.identity)
            logger.debug(`Sending account enable request for ${account.attributes.full_name}`)
            
            await httpClient.updateUser(input.identity, {"status": "A"})
            
            res.send(await readAccount(input.identity))
        })
        .stdAccountDisable(async (context: Context, input: StdAccountDisableInput, res: Response<StdAccountDisableOutput>) => {
            const account = await readAccount(input.identity)
            logger.debug(`Sending account disable request for ${account.attributes.full_name}`)
            
            await httpClient.updateUser(input.identity, {"status": "I"})
            
            res.send(await readAccount(input.identity))
        })
        .stdAccountUpdate(async (context: Context, input: StdAccountUpdateInput, res: Response<StdAccountUpdateOutput>) => {
            logger.info(`${input}`)

            for (let change of input.changes) {
                const values = [].concat(change.value)
                for (let value of values) {
                    const account = await readAccount(input.identity)
                    switch (change.op) {
                        case AttributeChangeOp.Add:
                            logger.info(`Sending provisioning request for ${account.attributes.full_name} to group id ${value}`)
                            await assignUserGroup(account, value)
                            break
                        case AttributeChangeOp.Remove:
                            logger.info(`Sending deprovisioning request for ${account.attributes.full_name} from group id ${value}`)
                            await removeUserGroup(account, value)
                            break
                        default:
                            throw new ConnectorError(`Operation not supported: ${change.op}`)
                    }
                }
            }
            const account = await readAccount(input.identity)
            logger.info(account)
            res.send(account)
        })
        .stdEntitlementList(async (context: Context, input: any, res: Response<StdEntitlementListOutput>) => {
            logger.info('Reading entitlements from LandView')

            logger.info('Reading groups from LandView')
            const group_response = await httpClient.getGroups()
            for (const gr of group_response.data) {
                const group : Group = await readGroup(gr.group_id)

                res.send(group)
            }

            logger.info('Reading permissions from LandView')
            const permissions_response = await httpClient.getPermissions()
            for(const per of permissions_response.data.data){
                const permission = await readPermission(per.permission_id)

                res.send(permission)
            }
        })
        .stdEntitlementRead(async (context: Context, input: StdEntitlementReadInput, res: Response<StdEntitlementReadOutput>) => {
            logger.debug(`Reading entitlement with Id ${input.identity}`)
            const group: Group = await readGroup(input.identity)
            
            res.send(group)
        })
}
