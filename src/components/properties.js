import Tonic from '@socketsupply/tonic'
import fs from 'socket:fs'
import path from 'socket:path'

import * as ini from '../lib/ini.js'

function trim (string) {
  const lines = string.split(/\r?\n/)

  let leadingSpaces = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      leadingSpaces = lines[i].search(/\S/)
      break
    }
  }

  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].slice(leadingSpaces).trimRight()
  }

  if (lines[0] === '') lines.shift()
  return lines.join('\n')
}

class AppProperties extends Tonic {
  constructor () {
    super()
  }

  async change (e) {
    const el = Tonic.match(e.target, '[data-event]')
    if (!el) return

    const { event, section, value } = el.dataset

    const app = this.props.parent
    const notifications = document.querySelector('#notifications')
    const editor = document.querySelector('app-editor')
    const project = document.querySelector('app-project')

    if (event === 'preview') {
      const pathToSettingsFile = path.join(path.DATA, 'projects', 'settings.json')
      const previewWindow = app.state.settings.previewWindows.find(o => o.title === value)

      if (previewWindow) {
        previewWindow.active = !previewWindow.active

        const currentProject = app.state.currentProject

        // if the user currently has the config file open in the editor...
        if (currentProject.label === 'settings.json' && currentProject.parent.id === 'root') {
          try {
            editor.value = JSON.stringify(app.state.settings, null, 2)
          } catch (err) {
            return notifications.create({
              type: 'error',
              title: 'Unable to save config file',
              message: err.message
            })
          }
        }

        try {
          const str = JSON.stringify(app.state.settings)
          await fs.promises.writeFile(pathToSettingsFile, str)
        } catch (err) {
          return notifications?.create({
            type: 'error',
            title: 'Error',
            message: 'Unable to update settings'
          })
        }

        app.activatePreviewWindows()
      }
    }

    if (event === 'property') {
      const node = project.getNodeByProperty('id', 'socket.ini')
      node.data = ini.set(node.data, section, el.id, el.value)

      const dest = path.join(app.state.cwd, node.id)
      await fs.promises.writeFile(dest, node.data)

      editor.loadProjectNode(node)

      notifications?.create({
        type: 'info',
        title: 'Note',
        message: 'A restart of the app your building may be required.'
      })
    }
  }

  async click (e) {
    const el = Tonic.match(e.target, '[data-event]')
    if (!el) return

    const { event, propertyValue } = el.dataset

    if (event === 'ext') {
      // TODO
    }
  }

  async loadProjectNode (node) {
    try {
      const pathToConfig = path.join(node.id, 'socket.ini')
      this.state.data = await fs.promises.readFile(pathToConfig, 'utf8')
    } catch {
      return false
    }

    this.reRender()
    return true
  }

  async render () {
    let data = this.state.data || ''

    const settings = this.props.parent.state.settings
    const previewWindows = []

    if (settings?.previewWindows) {
      let index = 0

      if (Array.isArray(settings.previewWindows)) {
        for (const w of settings.previewWindows) {
          if (!w.title) continue
          previewWindows.push(this.html`
            <tonic-checkbox
              id="${w.title}-${String(index++)}"
              data-event="preview"
              data-value="${w.title}"
              checked="${String(w.active)}"
              data-aspect-ratio="${w.aspectRatio}"
              data-resolution="${w.resolution}"
              label="${w.title}"
              title="${w.description || ''}"
            ></tonic-checkbox>
          `)
        }
      }
    }

    return this.html`
      <tonic-accordion id="options" selected="preview-windows">
        <tonic-accordion-section
          name="preview-windows"
          id="preview-windows"
          label="Preview Windows"
        >
          ${previewWindows}
        </tonic-accordion-section>
        <tonic-accordion-section
          name="application"
          id="application"
          label="Desktop Features"
        >
          <div class="option">
            <tonic-checkbox data-section="build" id="headless" checked="${ini.get(data, 'build', 'headless')}" data-event="property" label="Headless" title="Headless"></tonic-checkbox>
            <p>The app's primary window is initially hidden.</p>
          </div>

          <div class="option">
            <tonic-checkbox data-section="application" id="tray" checked="${ini.get(data, 'application', 'tray')}" label="Tray" data-event="property" title="Tray"></tonic-checkbox>
            <p>An icon is placed in the omni-present system menu (aka Tray). Clicking it triggers an event.</p>
          </div>

          <div class="option">
            <tonic-checkbox data-section="application" id="agent" checked="${ini.get(data, 'application', 'agent')}" data-event="property" label="Agent" title="Agent"></tonic-checkbox>
            <p>Apps do not appear in the task switcher or on the Dock.</p>
          </div>
        </tonic-accordion-section>
        <tonic-accordion-section
          name="permissions"
          id="permissions"
          label="Permissions"
        >
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_fullscreen" checked="${ini.get(data, 'permissions', 'allow_fullscreen')}" data-event="property" label="Full Screen"></tonic-checkbox>
            <p>Allow/Disallow fullscreen in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_microphone" checked="${ini.get(data, 'permissions', 'allow_microphone')}" data-event="property" label="Microphone"></tonic-checkbox>
            <p>Allow/Disallow microphone in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_camera" checked="${ini.get(data, 'permissions', 'allow_camera')}" data-event="property" label="Camera"></tonic-checkbox>
            <p>Allow/Disallow camera in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_user_media" checked="${ini.get(data, 'permissions', 'allow_user_media')}" data-event="property" label="User Media"></tonic-checkbox>
            <p>Allow/Disallow user media (microphone + camera) in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_geolocation" checked="${ini.get(data, 'permissions', 'allow_geolocation')}" data-event="property" label="Geolocation"></tonic-checkbox>
            <p>Allow/Disallow geolocation in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_notifications" checked="${ini.get(data, 'permissions', 'allow_notifications')}" data-event="property" label="Notifications"></tonic-checkbox>
            <p>Allow/Disallow notifications in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_sensors" checked="${ini.get(data, 'permissions', 'allow_sensors')}" data-event="property" label="Sensors"></tonic-checkbox>
            <p>Allow/Disallow sensors in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_clipboard" checked="${ini.get(data, 'permissions', 'allow_clipboard')}" data-event="property" label="Clipboard"></tonic-checkbox>
            <p>Allow/Disallow clipboard in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_bluetooth" checked="${ini.get(data, 'permissions', 'allow_bluetooth')}" data-event="property" label="Bluetooth"></tonic-checkbox>
            <p>Allow/Disallow bluetooth in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_data_access" checked="${ini.get(data, 'permissions', 'allow_data_access')}" data-event="property" label="Data Access"></tonic-checkbox>
            <p>Allow/Disallow data access in application</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_airplay" checked="${ini.get(data, 'permissions', 'allow_airplay')}" data-event="property" label="AirPlay"></tonic-checkbox>
            <p>Allow/Disallow AirPlay access in application (macOS/iOS) only</p>
          </div>
          <div class="option">
            <tonic-checkbox data-section="permissions" id="allow_hotkeys" checked="${ini.get(data, 'permissions', 'allow_hotkeys')}" data-event="property" label="AirPlay"></tonic-checkbox>
            <p>Allow/Disallow HotKey binding registration (desktop only)</p>
          </div>
        </tonic-accordion-section>
      </tonic-accordion>
    `
  }
}

export { AppProperties }
export default AppProperties
