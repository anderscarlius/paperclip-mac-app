import Foundation

struct UpstreamUpdateRecommendation: Equatable {
    enum Tone: Equatable {
        case neutral
        case positive
        case caution
    }

    let title: String
    let message: String
    let tone: Tone
}
