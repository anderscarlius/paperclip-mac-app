import Foundation

public enum TokenCounter {
    public static func approximateCount(in text: String) -> Int {
        let tokens = text
            .split { $0.isWhitespace || $0.isNewline }
            .map(String.init)
        let characterFactor = text.count / 4
        return max(tokens.count, characterFactor)
    }
}
