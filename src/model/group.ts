import { Attributes } from "@sailpoint/connector-sdk";

export class Group {
    identity: string
    uuid: string
    type: string = 'group'
    attributes: Attributes

    constructor(object: any) {
        this.attributes = {
            id: object.group_id?.toString(),
            name: object.group_name,
            description: object.description
        }
        this.identity = this.attributes.id as string
        this.uuid = this.attributes.name as string
    }
}