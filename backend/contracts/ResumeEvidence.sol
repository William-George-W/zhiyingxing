// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ResumeEvidence {
    // 触发事件以方便被监控和检索
    event ApplicationRecorded(
        uint256 indexed applicationId,
        string studentId,
        string jobId,
        string extraData,
        uint256 timestamp
    );

    // 存储以防万一直接查链
    struct ApplicationData {
        uint256 applicationId;
        string studentId;
        string jobId;
        string extraData;
        uint256 timestamp;
        address recorder;
    }

    mapping(uint256 => ApplicationData) public applications;

    function recordApplication(
        uint256 _applicationId,
        string memory _studentId,
        string memory _jobId,
        string memory _extraData
    ) public {
        // 如果已经存证过不应重复存，这里可以加判断
        require(applications[_applicationId].timestamp == 0, "Application already recorded.");

        applications[_applicationId] = ApplicationData({
            applicationId: _applicationId,
            studentId: _studentId,
            jobId: _jobId,
            extraData: _extraData,
            timestamp: block.timestamp,
            recorder: msg.sender
        });

        emit ApplicationRecorded(_applicationId, _studentId, _jobId, _extraData, block.timestamp);
    }
}
