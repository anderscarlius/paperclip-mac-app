import Foundation

struct RuntimeAgentAdapterChoice: Sendable {
    let adapterType: String
    let adapterConfig: [String: RuntimeJSONValue]
    let title: String
    let message: String
    let requiresExactConfiguration: Bool
}
