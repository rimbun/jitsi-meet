// @flow

import { jitsiLocalStorage } from '@jitsi/js-utils';
import uuid from 'uuid';

import { BILLING_ID, VPAAS_TENANT_PREFIX } from './constants';
import logger from './logger';

/**
 * Returns the full vpaas tenant if available, given a path.
 *
 * @param {string} path - The meeting url path.
 * @returns {string}
 */
export function extractVpaasTenantFromPath(path: string) {
    const [ , tenant ] = path.split('/');

    if (tenant.startsWith(VPAAS_TENANT_PREFIX)) {
        return tenant;
    }

    return '';
}

/**
 * Returns the vpaas tenant.
 *
 * @param {Object} state - The global state.
 * @returns {string}
 */
export function getVpaasTenant(state: Object) {
    return extractVpaasTenantFromPath(state['features/base/connection'].locationURL.pathname);
}

/**
 * Returns true if the current meeting is a vpaas one.
 *
 * @param {Object} state - The state of the app.
 * @param {boolean} requiredJwt - Whether jwt is required or not.
 * @returns {boolean}
 */
export function isVpaasMeeting(state: Object, requiredJwt: boolean = true) {
    const { billingCounterUrl, iAmRecorder, iAmSipGateway } = state['features/base/config'];
    const { jwt } = state['features/base/jwt'];

    const jwtBoolean = requiredJwt ? Boolean(jwt) : true;

    const isAllowed = iAmRecorder || iAmSipGateway || jwtBoolean;

    return Boolean(
        billingCounterUrl
        && extractVpaasTenantFromPath(
            state['features/base/connection'].locationURL.pathname)
        && isAllowed
    );
}

/**
 * Sends a billing counter request.
 *
 * @param {Object} reqData - The request info.
 * @param {string} reqData.baseUrl - The base url for the request.
 * @param {string} billingId - The unique id of the client.
 * @param {string} jwt - The JWT token.
 * @param {string} tenat - The client tenant.
 * @returns {void}
 */
export async function sendCountRequest({ baseUrl, billingId, jwt, tenant }: {
    baseUrl: string,
    billingId: string,
    jwt: string,
    tenant: string
}) {
    const fullUrl = `${baseUrl}/${encodeURIComponent(tenant)}/${billingId}`;
    const headers = {
        'Authorization': `Bearer ${jwt}`
    };

    try {
        const res = await fetch(fullUrl, {
            method: 'GET',
            headers
        });

        if (!res.ok) {
            logger.error('Status error:', res.status);
        }
    } catch (err) {
        logger.error('Could not send request', err);
    }
}

/**
 * Returns the stored billing id (or generates a new one if none is present).
 *
 * @returns {string}
 */
export function getBillingId() {
    let billingId = jitsiLocalStorage.getItem(BILLING_ID);

    if (!billingId) {
        billingId = uuid.v4();
        jitsiLocalStorage.setItem(BILLING_ID, billingId);
    }

    return billingId;
}

/**
 * Returns the billing id for vpaas meetings.
 *
 * @param {Object} state - The state of the app.
 * @returns {string | undefined}
 */
export function getVpaasBillingId(state: Object) {
    if (isVpaasMeeting(state)) {
        return getBillingId();
    }
}
