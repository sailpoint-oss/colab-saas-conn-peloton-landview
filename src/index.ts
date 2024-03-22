import { AxiosResponse } from 'axios'
import {
    Context,
    ConnectorError,
    createConnector,
    readConfig,
    logger,
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

    const assignUserGroup = async (account: Account, group: string) => {
        //double-check access isn't already assigned to avoid a unique constraint error
        const access_response = await httpClient.getUserGroupRel(account.identity,group)
        if(access_response.data.header.data_rows == 0){
            await httpClient.assignUserGroup(account.identity, group)
        }
        else{
            logger.info(`Not sending a provisioning request for ${account.attributes.full_name} into group id ${group} since user already has access assigned`)
        }
    }

    const removeUserGroup = async (account: Account, group: string) => {
        const user_group_response = await httpClient.getUserGroupRel(account.identity, group)
        const response = await httpClient.removeUserGroup(account.identity, user_group_response.data.data[0].rel_id)

        return response
    }

    return createConnector()
        .stdTestConnection(async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
            logger.info("Running test connection")
            res.send(await httpClient.testConnection())
        })
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            logger.info('std:account:list')
            const accounts: AxiosResponse = await httpClient.getAccounts()

            for (const acc of accounts.data) {
                const account: Account = await readAccount(acc.user_id)
                logger.info(account)
                res.send(account)
            }

        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            logger.info(`std:account:read: identityId - ${input.identity}`)
            const account = await readAccount(input.identity)
            res.send(account)
        })
        .stdAccountCreate(
            async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
                logger.info('std:account:create')
                logger.info(input)

                const user = {...input.attributes,...{ groups: undefined }}
                const account_response = await httpClient.createAccount(user)

                const account = await readAccount(account_response.data.user_id)

                logger.info(`New Account Created for ${account.attributes.full_name} - ${account.attributes}`)
                res.send(account)
            }
        )
        .stdAccountEnable(async (context: Context, input: StdAccountEnableInput, res: Response<StdAccountEnableOutput>) => {
            logger.debug(input, 'account enable input object')
            await httpClient.changeAccountStatus(input.identity,'A')
            res.send(await readAccount(input.identity))
        })
        .stdAccountDisable(async (context: Context, input: StdAccountDisableInput, res: Response<StdAccountDisableOutput>) => {
            logger.debug(input, 'account disable input object')
            await httpClient.changeAccountStatus(input.identity,'I')
            res.send(await readAccount(input.identity))
        })
        .stdAccountUpdate(async (context: Context, input: StdAccountUpdateInput, res: Response<StdAccountUpdateOutput>) => {
            logger.info('std:account:update')
            logger.info(input)

            for (let change of input.changes) {
                const values = [].concat(change.value)
                for (let value of values) {
                    const account = await readAccount(input.identity)
                    switch (change.op) {
                        case AttributeChangeOp.Add:
                            await assignUserGroup(account, value)
                            break
                        case AttributeChangeOp.Remove:
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
            logger.info('std:entitlement:list')

            const response = await httpClient.getGroups()
            for (const gr of response.data) {
                const group = new Group(gr)

                logger.info(group)
                res.send(group)
            }
        })
        .stdEntitlementRead(async (context: Context, input: StdEntitlementReadInput, res: Response<StdEntitlementReadOutput>) => {
            logger.debug(input, 'entitlement read input object')
            const account_response: AxiosResponse = await httpClient.getGroup(input.identity)
            const group: Group = new Group(account_response.data.data[0])
            res.send(group)
        })
}
