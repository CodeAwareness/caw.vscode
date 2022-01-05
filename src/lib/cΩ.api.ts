import axios from 'axios'

// We use https for direct API calls, and WSS for local service communication
import { API_URL, SERVER_WSS } from '../config'
import { wsIO } from './wsio'
import { showInformationMessage } from '../vscode/vscode'

import { CΩStore } from './cΩ.store'

const API_AUTH_LOGIN          = '/auth/login'
const API_AUTH_REFRESH_TOKENS = '/auth/refresh-tokens'
const API_REPO_SWARM_AUTH     = '/repos/swarm-auth'
const API_REPO_COMMITS        = '/repos/commits'
const API_REPO_COMMON_SHA     = '/repos/common-sha'
const API_REPO_CONTRIB        = '/repos/contrib'
const API_SHARE_ACCEPT        = '/share/accept'

wsIO.init()

axios.defaults.adapter = require('axios/lib/adapters/http')
const axiosAPI = axios.create({ baseURL: API_URL })

axiosAPI.interceptors.request.use(config => {
  const access = CΩStore.tokens?.access
  if (access?.token) config.headers!.authorization = `Bearer ${access.token}`
  return config
})

axiosAPI.interceptors.response.use(
  response => {
    if (response.status === 202) { // We are processing the requests as authorized for now, but we need to send the required (or latest) SHA to continue being authorized
      const authPromise = reAuthorize(response.statusText || response.data.statusText) // IMPORTANT: no await! otherwise we interrupt the regular operations for too long, and we also get deeper into a recursive interceptor response.
      // also, we do this strange response.statusText OR response.data.statusText because of a glitch in the test, it seems I can't make it work with supertest
      if (CΩStore.swarmAuthStatus) {
        // TODO: try to disconnect multiple swarmAuth promises (for multiple repos at a time), so one repo doesn't have to wait for all repos to complete swarm authorization.
        CΩStore.swarmAuthStatus.then(() => authPromise)
      } else {
        CΩStore.swarmAuthStatus = authPromise
      }
    }
    return response
  },
  err => {
    if (!err.response) return Promise.reject(err)
    return new Promise((resolve, reject) => {
      if (err.response.status === 401 && err.config && err.response.config.url !== API_AUTH_REFRESH_TOKENS) {
        if (!CΩStore.tokens) return CΩAPI.logout(reject, 'No tokens in the store.', err)
        const { refresh } = CΩStore.tokens
        if (!refresh || refresh.expires.valueOf() < new Date().valueOf()) {
          return CΩAPI.logout(reject, 'Refresh token expired ' + refresh.expires, err)
        }
        return CΩAPI.refreshToken(refresh.token)
          .then(() => {
            const token = CΩStore.tokens?.access?.token
            err.config.headers.authorization = `Bearer: ${token}`
            axiosAPI(err.config).then(resolve, reject)
          })
          .catch(err => {
            return CΩAPI.logout(reject, 'You have been logged out', err)
          })
      }
      return reject(err)
    })
  },
)

function clearAuth() {
  // TODO
  return Promise.resolve()
}

/**
 * reAuthorize: fetch and send the latest SHA
 */
function reAuthorize(text: string) {
  // TODO
  return Promise.resolve()
}

function logout(reject?: any, msg?: string, err?: any) {
  CΩStore.user = undefined
  CΩStore.tokens = undefined
  showInformationMessage(`Disconnected from CΩ. ${msg}`)

  if (reject) reject(err)
}

function refreshToken(refreshToken: string) {
  // TODO
  return Promise.resolve()
}

export type TCredentials = {
  email: string
  password: string
}

const login = (cred: TCredentials) => axiosAPI.post(API_AUTH_LOGIN, cred)

const receiveShared = (link: string) => {
  return axiosAPI.get(`${API_SHARE_ACCEPT}?i=${link}`)
}

const CΩAPI = {
  clearAuth,
  login,
  logout,
  receiveShared,
  refreshToken,
  API_AUTH_LOGIN,
  API_REPO_COMMITS,
  API_REPO_COMMON_SHA,
  API_REPO_CONTRIB,
  API_AUTH_REFRESH_TOKENS,
  API_REPO_SWARM_AUTH,
  API_URL,
}

export {
  CΩAPI,
}
