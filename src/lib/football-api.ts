import axios, { AxiosInstance } from "axios";

class FootballAPIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.FOOTBALL_DATA_API_URL || "https://api.football-data.org/v4",
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY || "",
      },
      timeout: 10000,
    });
  }

  async getCompetitions() {
    const response = await this.client.get("/competitions");
    return response.data;
  }

  async getCompetition(competitionCode: string) {
    const response = await this.client.get(`/competitions/${competitionCode}`);
    return response.data;
  }

  async getCompetitionTeams(competitionCode: string) {
    const response = await this.client.get(`/competitions/${competitionCode}/teams`);
    return response.data;
  }

  async getTeam(teamId: number) {
    const response = await this.client.get(`/teams/${teamId}`);
    return response.data;
  }

  async getTeamPlayers(teamId: number) {
    const response = await this.client.get(`/teams/${teamId}/players`);
    return response.data;
  }

  async getMatches(competitionCode?: string, date?: string) {
    const params = new URLSearchParams();
    if (competitionCode) params.append("competitions", competitionCode);
    if (date) params.append("date", date);
    
    const response = await this.client.get(`/matches?${params.toString()}`);
    return response.data;
  }

  async getMatch(matchId: number) {
    const response = await this.client.get(`/matches/${matchId}`);
    return response.data;
  }

  async getTodayMatches() {
    const today = new Date().toISOString().split("T")[0];
    return this.getMatches(undefined, today);
  }

  async getLiveMatches() {
    const response = await this.client.get("/matches?status=LIVE");
    return response.data;
  }

  async getCompetitionStandings(competitionCode: string, matchday?: number) {
    const url = matchday 
      ? `/competitions/${competitionCode}/standings?matchday=${matchday}`
      : `/competitions/${competitionCode}/standings`;
    const response = await this.client.get(url);
    return response.data;
  }

  async searchTeams(teamName: string) {
    const response = await this.client.get(`/teams?name=${encodeURIComponent(teamName)}`);
    return response.data;
  }
}

export const footballApi = new FootballAPIClient();
export default footballApi;