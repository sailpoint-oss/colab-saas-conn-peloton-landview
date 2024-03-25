import { Attributes } from "@sailpoint/connector-sdk";

export class Permission {
    identity: string
    uuid: string
    type: string = 'group'
    attributes: Attributes

    constructor(object: any) {
        this.attributes = {
            id: object.permission_id?.toString(),
            name: object.permission_name,
            description: object.description,
            groups: object.groups
        }
        this.identity = this.attributes.id as string
        this.uuid = this.attributes.name as string
    }
}