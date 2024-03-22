import { Attributes, StdAccountReadOutput } from '@sailpoint/connector-sdk'
import { Group } from "./group"

export class Account {
    identity: string
    uuid: string
    attributes: Attributes
    disabled: boolean

    constructor(object: any) {
        this.attributes = {
            user_id: object.user_id?.toString(),
            status: object.status,
            user_name: object.user_name,
            full_name: object.full_name,
            email_address: object.email_address,
            groups: object.groups
        }
        this.identity = this.attributes.user_id?.toString() as string
        this.uuid = this.attributes.user_name as string
        this.disabled = (object.status === "I") ? true : false
    }
}
