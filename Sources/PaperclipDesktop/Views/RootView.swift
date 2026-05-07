import SwiftUI

struct RootView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Group {
            if model.shouldPresentSetupWizard {
                SetupWizardView(model: model)
            } else {
                MainWindowView(model: model)
            }
        }
        .sheet(isPresented: $model.showNewCompanyWizard) {
            NewCompanyWizardView(defaultModelID: model.config.defaultModelID) { draft in
                model.createCompany(from: draft)
            }
        }
        .sheet(isPresented: Binding(
            get: { model.instructionEditorSession != nil },
            set: { isPresented in
                if !isPresented {
                    model.instructionEditorSession = nil
                }
            }
        )) {
            InstructionEditorView(model: model)
        }
        .alert(
            "Paperclip Desktop",
            isPresented: Binding(
                get: { model.errorMessage != nil },
                set: { isPresented in
                    if !isPresented {
                        model.errorMessage = nil
                    }
                }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.errorMessage ?? "")
        }
    }
}
