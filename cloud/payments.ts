import {HttpError} from './security.js';
export interface PaymentProvider {verifySignature(...args:string[]):void;getPayment(id:string):Promise<never>;createCheckout(order:unknown):Promise<{id:string;url:string}>;}
export class MercadoPagoProvider implements PaymentProvider {
 constructor(_config:unknown){}
 verifySignature(..._args:string[]):never{throw new HttpError(503,'Los pagos en línea están desactivados. Coordina por WhatsApp');}
 async getPayment(_id:string):Promise<never>{return this.verifySignature();}
 async createCheckout(_order:unknown):Promise<never>{return this.verifySignature();}
}
