import SwiftUI

@main
struct PaperclipDesktopApp: App {
    @State private var model = DesktopAppModel()

    var body: some Scene {
        WindowGroup("Paperclip Desktop", id: "main") {
            RootView(model: model)
                .preferredColorScheme(model.config.themePreference.colorScheme)
                .frame(minWidth: 1120, minHeight: 760)
        }
        .defaultSize(width: 1320, height: 860)

        Settings {
            SettingsView(model: model)
                .preferredColorScheme(model.config.themePreference.colorScheme)
                .frame(width: 760, height: 560)
        }

        Window("About Paperclip Desktop", id: "about") {
            AboutPaperclipDesktopView()
                .preferredColorScheme(model.config.themePreference.colorScheme)
        }
        .defaultSize(width: 900, height: 720)

        MenuBarExtra("Paperclip Desktop", systemImage: "paperclip") {
            MenuBarView(model: model)
        }
        .commands {
            AppCommands()
        }
    }
}
